import { prisma } from "@/lib/prisma";
import { getFounderOrg } from "./founder-org";
import { LeadSource, LeadStatus } from "@/generated/prisma";

export interface ScrapeParams {
  niche: string;
  location: string;
  limit?: number;
}

export interface ScrapedLead {
  name: string;
  company: string;
  website?: string;
  phone?: string;
  email?: string;
  googleMapsUrl?: string;
  raw?: any;
}

export class ScraperService {
  /**
   * Main entry point to run a scrape and save results.
   */
  async runSearchAndSave(params: ScrapeParams) {
    const { niche, location, limit = 10 } = params;
    
    console.log(`[Scraper] Starting search: "${niche}" in "${location}"`);
    
    // 1. Get founder org
    const org = await getFounderOrg();
    
    // 2. Perform scraping (Mock for now, would call SerpApi/Outscraper/etc)
    const results = await this.mockScrape(niche, location, limit);
    
    const savedLeads = [];
    
    // 3. Process and Save (Deduplication)
    for (const leadData of results) {
      if (!leadData.website && !leadData.googleMapsUrl) continue;
      
      // Basic deduplication by website
      let existingLead = null;
      if (leadData.website) {
        existingLead = await prisma.lead.findFirst({
          where: {
            organizationId: org.id,
            website: leadData.website,
          },
        });
      }

      if (existingLead) {
        console.log(`[Scraper] Skipping duplicate lead: ${leadData.company}`);
        continue;
      }

      // Create new lead
      const lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          name: leadData.name || leadData.company,
          company: leadData.company,
          website: leadData.website,
          phone: leadData.phone,
          email: leadData.email,
          googleMapsUrl: leadData.googleMapsUrl,
          source: LeadSource.GOOGLE_MAPS,
          status: LeadStatus.NEW,
          searchQuery: niche,
          location: location,
          rawScrapedData: leadData.raw || {},
        },
      });
      
      savedLeads.push(lead);
    }

    console.log(`[Scraper] Finished. Saved ${savedLeads.length} new leads.`);
    return savedLeads;
  }

  private async mockScrape(niche: string, location: string, limit: number): Promise<ScrapedLead[]> {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    
    const mocks: ScrapedLead[] = [
      {
        name: "Dr. Smith",
        company: "Austin Perfect Smiles",
        website: "https://austinperfectsmiles.com",
        phone: "+1 512-555-0199",
        googleMapsUrl: "https://maps.google.com/123",
        raw: { rating: 4.8, reviews: 156 }
      },
      {
        name: "Sarah Johnson",
        company: "Capital Dental Care",
        website: "https://capitaldental.com",
        phone: "+1 512-555-0122",
        googleMapsUrl: "https://maps.google.com/456",
        raw: { rating: 4.2, reviews: 89 }
      },
      {
        name: "General Manager",
        company: "North Austin Ortho",
        website: "https://northaustinortho.io",
        phone: "+1 512-555-0155",
        googleMapsUrl: "https://maps.google.com/789",
        raw: { rating: 4.5, reviews: 204 }
      }
    ];

    return mocks.slice(0, limit);
  }
}

export const scraperService = new ScraperService();
