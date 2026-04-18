import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFounderOrg } from '@/services/founder-org';

export async function GET(req: NextRequest) {
  try {
    const org = await getFounderOrg();
    
    const jobs = await prisma.scrapeJob.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Background Cleanup: Auto-fail jobs stuck in RUNNING for more than 30 mins
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckJobs = jobs.filter(j => j.status === 'RUNNING' && new Date(j.startedAt || j.createdAt) < thirtyMinsAgo);
    
    if (stuckJobs.length > 0) {
      await prisma.scrapeJob.updateMany({
        where: { id: { in: stuckJobs.map(j => j.id) } },
        data: { status: 'FAILED', errorLog: 'Auto-terminated: Job exceeded maximum possible execution window (30m).' }
      });
      // Re-fetch to return accurate status
      return NextResponse.json(await prisma.scrapeJob.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      }));
    }

    return NextResponse.json(jobs);
  } catch (err) {
    console.error('Jobs GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
