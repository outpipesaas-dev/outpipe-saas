import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/inngest/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || !lead.website) {
      return NextResponse.json({ error: 'Lead with website not found' }, { status: 404 });
    }

    // Trigger background analysis via Inngest
    await inngest.send({
      name: 'diagnostic/requested',
      data: {
        leadId: lead.id,
        website: lead.website,
      },
    });

    return NextResponse.json({ message: 'Analysis triggered successfully' });
  } catch (err) {
    console.error('Analyze POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
