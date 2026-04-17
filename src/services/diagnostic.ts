import { chromium, Browser, Page } from 'playwright';
import { prisma } from '@/lib/prisma';
import { DiagnosticStatus } from '@/generated/prisma';

export interface EvidenceEntry {
  label: string;
  status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reason: string;
}

export interface CommercialSignals {
  // Primary (Commercial)
  hasChatbot: boolean;
  hasBooking: boolean;
  hasCtaAboveFold: boolean;
  hasLeadForm: boolean;
  hasCheckout: boolean;
  
  // Secondary (Structure/Content)
  wordCount: number;
  hasFaq: boolean;
  hasServiceBlock: boolean;
  loadTimeSeconds: number;
  isModernTech: boolean;
  
  // Intelligence
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunityType: string;
  recommendedService: string;
  overallScore: number;
  evidenceLog: EvidenceEntry[];
}

export class DiagnosticService {
  /**
   * Run a commercial diagnostic on a lead's website.
   */
  async analyzeWebsite(leadId: string, url: string | null): Promise<CommercialSignals | null> {
    if (!url) return this.handleNoWebsite(leadId);

    console.log(`[Diagnostic] Refined Analysis for Lead ${leadId}: ${url}`);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found");

    let diagnostic = await prisma.diagnostic.findFirst({ where: { leadId } });
    if (!diagnostic) {
       diagnostic = await prisma.diagnostic.create({
         data: { leadId, organizationId: lead.organizationId, status: DiagnosticStatus.ANALYZING }
       });
    } else {
      await prisma.diagnostic.update({ where: { id: diagnostic.id }, data: { status: DiagnosticStatus.ANALYZING } });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      const startTime = Date.now();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const loadTime = (Date.now() - startTime) / 1000;

      const pageData = await page.evaluate(() => {
        const html = document.documentElement.innerHTML.toLowerCase();
        const text = document.body.innerText.toLowerCase();
        
        // Content Heuristics
        const faqKeywords = ['faq', 'frequently asked', 'perguntas frequentes', 'questions', 'how it works'];
        const hasFaq = faqKeywords.some(kw => html.includes(kw));
        
        const serviceKeywords = ['our services', 'what we do', 'nossos serviços', 'specialties'];
        const hasServiceBlock = serviceKeywords.some(kw => html.includes(kw));

        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src.toLowerCase());
        const hasStripe = scripts.some(s => s.includes('stripe')) || html.includes('stripe.com');
        const hasCheckout = html.includes('checkout') || html.includes('add to cart') || html.includes('carrinho');
        
        const hasModernCSS = html.includes('--font') || html.includes('var(');
        const hasNextJS = html.includes('_next/static');

        return { hasFaq, hasServiceBlock, wordCount: text.split(/\s+/).length, hasStripe, hasCheckout, scripts, hasModernCSS, hasNextJS };
      });

      // 1. Primary Checks (Selectors)
      const hasChatbot = await page.evaluate(() => {
        const chatbotKeywords = ['intercom', 'crisp', 'tawk.to', 'zendesk', 'drift', 'hubspot'];
        const scriptMatch = Array.from(document.querySelectorAll('script')).some(s => chatbotKeywords.some(kw => s.src.toLowerCase().includes(kw)));
        const domMatch = !!document.querySelector('[id*="chat"], [class*="chat"], [class*="widget"], iframe[title*="Chat"]');
        return scriptMatch || domMatch;
      });

      const hasBooking = await page.evaluate(() => {
        const bookingKws = ['calendly.com', 'acuityscheduling.com', 'setmore.com', 'booker.com', 'vagaro.com'];
        const links = Array.from(document.querySelectorAll('a')).map(a => a.href.toLowerCase());
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src.toLowerCase());
        return bookingKws.some(kw => links.some(l => l.includes(kw)) || iframes.some(i => i.includes(kw)));
      });

      const hasCta = await page.evaluate(() => {
        const actionKws = ['schedule', 'book', 'contact', 'get started', 'purchase', 'buy', 'appointment', 'assinar', 'comprar'];
        return Array.from(document.querySelectorAll('button, a')).some(el => {
          const r = el.getBoundingClientRect();
          return r.top < 1000 && r.height > 0 && actionKws.some(kw => el.textContent?.toLowerCase().includes(kw));
        });
      });

      const hasForm = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).some(f => {
          const inputs = f.querySelectorAll('input, textarea');
          return Array.from(inputs).some(i => {
            const t = i.getAttribute('type')?.toLowerCase();
            const n = i.getAttribute('name')?.toLowerCase();
            return t === 'email' || t === 'tel' || n?.includes('email') || n?.includes('phone');
          });
        });
      });

      // ── EVIDENCE GENERATION ──
      const log: EvidenceEntry[] = [];
      log.push({ label: 'CTA Above Fold', status: hasCta ? 'POSITIVE' : 'NEGATIVE', reason: hasCta ? 'Found direct action button in hero.' : 'No primary action button found in the top viewport.' });
      log.push({ label: 'Lead Capture', status: hasForm ? 'POSITIVE' : 'NEGATIVE', reason: hasForm ? 'Interactive form detected.' : 'No lead capture form found on main page.' });
      log.push({ label: 'Booking System', status: hasBooking ? 'POSITIVE' : 'NEGATIVE', reason: hasBooking ? 'Automated scheduling link found.' : 'Requires manual contact for booking.' });
      log.push({ label: 'Chat/Support', status: hasChatbot ? 'POSITIVE' : 'NEGATIVE', reason: hasChatbot ? 'Live chat or bot detected.' : 'Missing conversational sales assistance.' });
      if (pageData.hasFaq) log.push({ label: 'Complex Logic', status: 'NEUTRAL', reason: 'FAQ section detected - high potential for AI Assistant.' });

      // ── OPPORTUNITY SCORING & TYPE ──
      let opp = 'STABLE_SITE';
      let service = 'General Improvements';
      let score = 10; // Base score

      if (!hasCta) {
        opp = 'SILENT_HERO';
        service = 'Sales Page / CTA Optimization';
        score += 40;
      } else if (!hasForm && !hasBooking) {
        opp = 'LEAK_PRONE';
        service = 'Automation / Custom Lead Capture';
        score += 35;
      } else if (pageData.hasFaq || (pageData.wordCount > 1000 && !hasChatbot)) {
        opp = 'INFORMATION_MAZE';
        service = 'AI Support Assistant (LLM)';
        score += 25;
      } else if (!pageData.hasStripe && !pageData.hasCheckout && pageData.wordCount > 300) {
        opp = 'FRICTION_HEAVY';
        service = 'Stripe-Integrated Landing Page';
        score += 20;
      } else if (!pageData.hasModernCSS) {
        opp = 'VISUAL_GHOST';
        service = 'Modern Website Refactor';
        score += 15;
      }

      if (loadTime > 4) score += 10;

      const signals: CommercialSignals = {
        hasChatbot, hasBooking, hasCtaAboveFold: hasCta, hasLeadForm: hasForm,
        hasCheckout: pageData.hasStripe || pageData.hasCheckout,
        wordCount: pageData.wordCount, hasFaq: pageData.hasFaq, hasServiceBlock: pageData.hasServiceBlock,
        loadTimeSeconds: loadTime, isModernTech: pageData.hasNextJS || pageData.hasModernCSS,
        confidence: response?.status() === 200 ? 'HIGH' : 'MEDIUM',
        opportunityType: opp,
        recommendedService: service,
        overallScore: Math.min(score, 100),
        evidenceLog: log
      };

      await prisma.diagnostic.update({
        where: { id: diagnostic.id },
        data: {
          status: DiagnosticStatus.COMPLETED,
          websiteAudit: signals as any,
          overallScore: signals.overallScore,
          opportunities: { type: opp, service: service, confidence: signals.confidence },
          aiSummary: `Logic: ${opp}. Service: ${service}. Evidence: ${log.filter(l => l.status === 'NEGATIVE').map(l => l.label).join(', ') || 'None'}`
        }
      });

      return signals;

    } catch (err: any) {
      console.error(`[Diagnostic] Refinement Error for ${leadId}:`, err);
      await prisma.diagnostic.update({ where: { id: diagnostic.id }, data: { status: DiagnosticStatus.FAILED, aiSummary: `Failed: ${err.message}` } });
      return null;
    } finally {
      await browser.close();
    }
  }

  private async handleNoWebsite(leadId: string): Promise<CommercialSignals | null> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;

    const signals: any = {
      opportunityType: 'NO_WEBSITE',
      recommendedService: 'Institutional Website Launch',
      overallScore: 90,
      confidence: 'HIGH',
      evidenceLog: [{ label: 'Online Presence', status: 'NEGATIVE', reason: 'Business has no website link in records.' }]
    };

    await prisma.diagnostic.upsert({
      where: { leadId },
      update: { status: DiagnosticStatus.COMPLETED, websiteAudit: signals, overallScore: 90, aiSummary: "Lead has no website. Prime target for institutional foundation." },
      create: { leadId, organizationId: lead.organizationId, status: DiagnosticStatus.COMPLETED, websiteAudit: signals, overallScore: 90, aiSummary: "Lead has no website. Prime target for institutional foundation." }
    });
    return signals;
  }
}

export const diagnosticService = new DiagnosticService();

export const diagnosticService = new DiagnosticService();

export const diagnosticService = new DiagnosticService();
