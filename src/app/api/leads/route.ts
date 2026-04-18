import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFounderOrg } from '@/services/founder-org';
import { LeadStatus, LeadTier } from '@/generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const org = await getFounderOrg();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as LeadStatus | null;
    const tier = searchParams.get('tier') as LeadTier | null;
    const jobId = searchParams.get('jobId');
    
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: org.id,
        ...(status ? { status } : { 
          NOT: { status: 'RECYCLED' as LeadStatus }
        }),
        ...(tier ? { tier } : {
           // Default: hide SKIP noise if not specifically looking for it
           NOT: { tier: 'SKIP' as LeadTier }
        }),
        ...(jobId && jobId !== 'all' ? { scrapeJobId: jobId } : {}),
      },
      include: {
        diagnostics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      // Sort by best opportunities first
      orderBy: [
        { tier: 'asc' }, // HOT (0), GOOD (1), MAYBE (2), SKIP (3) -> Wait, Enums are ordered alphabetically in Prisma unless defined otherwise.
        // Actually, Prisma Enums are strings.
        { score: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json(leads);
  } catch (err) {
    console.error('Leads GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const org = await getFounderOrg();
    const { id, status, score, tier } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const lead = await prisma.lead.update({
      where: { id, organizationId: org.id },
      data: { 
        ...(status && { status }),
        ...(score !== undefined && { score }),
        ...(tier && { 
          tier,
          isTierLocked: true, // Manual override locks the tier
          tierReason: 'Manual Override'
        }),
      },
    });

    return NextResponse.json(lead);
  } catch (err) {
    console.error('Lead PATCH Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
