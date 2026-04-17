import { scrapeGoogleMaps } from '@/scripts/google-maps-scraper';
import { getFounderOrg } from '@/services/founder-org';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, location, maxResults } = body;

    if (!query || !location) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
