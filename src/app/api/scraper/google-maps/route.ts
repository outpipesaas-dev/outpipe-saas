import { scrapeGoogleMaps } from '@/scripts/google-maps-scraper';
import { getFounderOrg } from '@/services/founder-org';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { query, location, maxResults } = body;

    // --- NORMALIZATION & ROBUSTNESS ---
    const normalize = (val: string) => {
      if (!val) return "";
      return val
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .replace(/[;&%]/g, ''); // sanitize potentially dangerous chars while leaving slashes/commas for compound queries
    };

    query = normalize(query);
    location = normalize(location);

    if (!query || !location) {
      console.error('[Scraper API] Validation failed: Query or Location is missing or empty after normalization.');
      return Response.json({ 
        error: 'Incomplete Search Criteria',
        details: 'Both Niche/Industry and Location are required. Please avoid using only special characters.' 
      }, { status: 400 });
    }

    console.log(`[Scraper API] Starting Job: "${query}" in "${location}" (max: ${maxResults})`);

    const org = await getFounderOrg();

    // Create a ScrapeJob to track progress
    const job = await prisma.scrapeJob.create({
      data: {
        organizationId: org.id,
        source: 'GOOGLE_MAPS',
        query,
        location,
        limit: Number(maxResults) || 50,
        status: 'PENDING',
      }
    });

    // Run in background (non-blocking)
    // We don't await this to respond to the user immediately
    scrapeGoogleMaps({
      query,
      location,
      maxResults: Number(maxResults) || 50,
      organizationId: org.id,
      jobId: job.id
    }).catch(err => {
      console.error('Error in background scraping:', err);
    });

    return Response.json({ 
      message: 'Scraping job created', 
      jobId: job.id,
      query, 
      location 
    }, { 
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return Response.json({ 
      error: 'Internal Server Error',
      details: err.message
    }, { status: 500 });
  }
}
