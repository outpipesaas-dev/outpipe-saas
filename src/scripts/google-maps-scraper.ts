import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';

dotenv.config();

interface ScrapeParams {
  query: string;
  location: string;
  maxResults: number;
  organizationId?: string;
  jobId?: string;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

export async function scrapeGoogleMaps({ query, location, maxResults, organizationId, jobId }: ScrapeParams) {
  const startTime = Date.now();
  const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes hard limit
  
  const logStage = async (stage: string, data?: any) => {
    console.log(`[Job ${jobId || 'CLI'}] Stage: ${stage}`, data || '');
    if (jobId) {
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: { errorLog: `[${new Date().toISOString()}] ${stage}${data ? ': ' + JSON.stringify(data) : ''}` }
      });
    }
  };

  await logStage('INITIALIZING', { query, location, maxResults });

  let orgId = organizationId;
  const job = jobId ? await prisma.scrapeJob.findUnique({ where: { id: jobId } }) : null;

  if (job) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'RUNNING', startedAt: new Date() }
    });
    orgId = job.organizationId;
  }

  // Fallback for Org
  if (!orgId) {
    const firstOrg = await prisma.organization.findFirst();
    orgId = firstOrg?.id;
  }

  if (!orgId) {
    await logStage('FAILED', 'No organization context found.');
    if (job) await prisma.scrapeJob.update({ where: { id: job.id }, data: { status: 'FAILED' } });
    return;
  }

  const browser: Browser = await chromium.launch({ headless: true });
  
  try {
    // Wrap entire execution in a timeout
    await Promise.race([
      (async () => {
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page: Page = await context.newPage();
        
        await logStage('BROWSER_READY');

        const enrichedQuery = `${query} in ${location}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(enrichedQuery)}`;
        
        await logStage('NAVIGATING_TO_MAPS', { url: searchUrl });
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });
        
        const noResults = await page.isVisible('text=Google Maps não encontrou resultados');
        if (noResults) {
          throw new Error(`No results found for "${enrichedQuery}"`);
        }

        await page.waitForSelector('div[role="feed"]', { timeout: 20000 }).catch(() => {
          console.warn('[Scraper] Feed search took too long or layout is different.');
        });

        await logStage('SCROLLING_FOR_RESULTS');
        let lastCount = 0;
        let scrollAttempts = 0;
        
        while (scrollAttempts < 15) {
          const feed = page.locator('div[role="feed"]');
          if (!(await feed.count())) break;

          await feed.evaluate(node => node.scrollTop = node.scrollHeight);
          await delay(2000);

          const count = await page.locator('.Nv2PK').count();
          if (count === lastCount || count >= maxResults) break;
          lastCount = count;
          scrollAttempts++;
          
          if (await page.isVisible('text=Você chegou ao fim da lista')) break;
        }

        const cardLocators = page.locator('.Nv2PK');
        const totalFound = await cardLocators.count();
        const limit = Math.min(totalFound, maxResults);

        await logStage('EXTRACTION_STARTED', { found: totalFound, target: limit });

        if (job) {
          await prisma.scrapeJob.update({ where: { id: job.id }, data: { leadsFound: totalFound } });
        }

        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < limit; i++) {
          const card = cardLocators.nth(i);
          try {
            await card.click({ timeout: 10000 });
            await delay(getRandomDelay(1, 3));

            const name = await page.locator('h1.DUwDvf').first().textContent({ timeout: 5000 }).catch(() => '');
            if (!name) continue;

            const website = await page.locator('a[data-item-id="authority"]').first().getAttribute('href', { timeout: 3000 }).catch(() => null);
            const phone = await page.locator('button[data-item-id^="phone:tel:"]').first().getAttribute('data-item-id', { timeout: 3000 }).then(v => v?.replace('phone:tel:', '')).catch(() => null);
            const address = await page.locator('button[data-item-id="address"]').first().textContent({ timeout: 3000 }).catch(() => '');
            
            const leadData = {
              name: name.trim(),
              company: name.trim(),
              website: website || null,
              phone: phone || null,
              source: 'GOOGLE_MAPS' as const,
              status: 'NEW' as const,
              organizationId: orgId!,
              scrapeJobId: job?.id || null,
              searchQuery: query,
              location: location,
              firmographics: { address: address?.trim() || null }
            };

            const existing = await prisma.lead.findFirst({
              where: { organizationId: orgId, OR: [{ website: leadData.website }, { name: leadData.name }] }
            });

            if (!existing) {
              const newLead = await prisma.lead.create({ data: leadData });
              try {
                const { tierEngine } = await import('../services/tier-engine');
                await tierEngine.updateLeadTier(newLead.id);
              } catch {}
              imported++;
            } else {
              skipped++;
            }

            if (job) {
              await prisma.scrapeJob.update({
                where: { id: job.id },
                data: { leadsImported: imported, leadsSkipped: skipped }
              });
            }
          } catch (itemErr) {
            console.error(`[Job ${jobId}] Failed on item ${i}:`, itemErr);
          }
        }

        if (job) {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED', finishedAt: new Date() }
          });
        }
        await logStage('COMPLETED', { imported, skipped });
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOB_TIMEOUT')), GLOBAL_TIMEOUT_MS))
    ]);

  } catch (error: any) {
    const errorMsg = error.message === 'JOB_TIMEOUT' ? 'Global timeout: Job exceeded 10 minutes.' : error.message;
    await logStage('FAILED', errorMsg);
    if (job) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorLog: errorMsg, finishedAt: new Date() }
      });
    }
  } finally {
    await browser.close().catch(() => null);
    
    // Safety check: ensure terminal state
    if (job) {
      const finalCheck = await prisma.scrapeJob.findUnique({ where: { id: job.id } });
      if (finalCheck?.status === 'RUNNING') {
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorLog: 'Lifecycle safety: Job terminated without explicit resolution.' }
        });
      }
    }
  }
}

// CLI execution
const isMainModule = typeof require !== 'undefined' && require.main === module;
if (isMainModule) {
  const query = process.argv[2] || 'clínicas odontológicas';
  const location = process.argv[3] || 'São Paulo';
  const maxResults = parseInt(process.argv[4]) || 10;

  scrapeGoogleMaps({ query, location, maxResults })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
