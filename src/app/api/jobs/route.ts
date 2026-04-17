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

    return NextResponse.json(jobs);
  } catch (err) {
    console.error('Jobs GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
