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
  console.log(`Starting scrape for "${query}" in "${location}" (max results: ${maxResults})`);

  let orgId = organizationId;
  const job = jobId ? await prisma.scrapeJob.findUnique({ where: { id: jobId } }) : null;

  if (job) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'RUNNING', startedAt: new Date() }
    });
    orgId = job.organizationId;
  }

  if (!orgId) {
    const firstOrg = await prisma.organization.findFirst();
    if (!firstOrg) {
      console.error('No organization found in database.');
      if (job) await prisma.scrapeJob.update({ where: { id: job.id }, data: { status: 'FAILED', errorLog: 'No organization found' } });
      return;
    }
    orgId = firstOrg.id;
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page: Page = await context.newPage();
  
  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' in ' + location)}`;
    await page.goto(searchUrl);
    await page.waitForSelector('div[role="feed"]', { timeout: 10000 }).catch(() => null);

    let lastCount = 0;
    while (true) {
      const feed = await page.locator('div[role="feed"]');
      if (!(await feed.count())) break;

      await feed.evaluate(node => node.scrollTop = node.scrollHeight);
      await delay(2000);

      const cards = page.locator('.Nv2PK');
      const count = await cards.count();
      
      if (count === lastCount || count >= maxResults) break;
      lastCount = count;
      
      const endMessage = await page.isVisible('text=Você chegou ao fim da lista');
      if (endMessage) break;
    }

    const cardLocators = page.locator('.Nv2PK');
    const totalFound = await cardLocators.count();
    const limit = Math.min(totalFound, maxResults);

    if (job) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { leadsFound: totalFound }
      });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < limit; i++) {
      const card = cardLocators.nth(i);
      
      try {
        await card.click();
        await delay(getRandomDelay(2, 4));

        const name = await page.locator('h1.DUwDvf').first().textContent().catch(() => '');
        const website = await page.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => null);
        const phone = await page.locator('button[data-item-id^="phone:tel:"]').first().getAttribute('data-item-id').then(v => v?.replace('phone:tel:', '')).catch(() => null);
        const address = await page.locator('button[data-item-id="address"]').first().textContent().catch(() => '');
        const rating = await page.locator('span.ceNzR .fontBodyMedium span').first().getAttribute('aria-label').catch(() => null);
        const reviewsCount = await page.locator('.F7nice span[aria-label*="comentários"]').first().textContent().catch(() => null);
        const category = await page.locator('button.DkEaL').first().textContent().catch(() => null);
        const googleMapsUrl = page.url();

        const leadData = {
          name: name?.trim() || 'Unknown',
          company: name?.trim() || 'Unknown',
          website: website || null,
          phone: phone || null,
          googleMapsUrl,
          source: 'GOOGLE_MAPS' as const,
          status: 'NEW' as const,
          organizationId: orgId!,
          scrapeJobId: job?.id || null,
          searchQuery: query,
          location: location,
          rawScrapedData: {
            rating: rating || null,
            reviews_count: reviewsCount || null,
            category: category || null,
            address: address?.trim() || null,
          },
          firmographics: {
            rating: rating || null,
            reviews_count: reviewsCount || null,
            categories: category ? [category] : [],
            address: address?.trim() || null,
          }
        };

        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId: orgId,
            OR: [
              { googleMapsUrl: leadData.googleMapsUrl },
              { website: leadData.website },
              { name: leadData.name }
            ]
          }
        });

        if (!existingLead) {
          await prisma.lead.create({ data: leadData });
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

      } catch (err) {
        console.error(`Error extracting lead ${i + 1}:`, err);
      }

      await delay(getRandomDelay(2, 5));
    }

    if (job) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', finishedAt: new Date() }
      });
    }

  } catch (error: any) {
    console.error('Scraping failed:', error);
    if (job) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorLog: error.message, finishedAt: new Date() }
      });
    }
  } finally {
    await browser.close();
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
