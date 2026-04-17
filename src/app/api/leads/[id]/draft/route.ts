import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { outreachGenerator } from '@/services/outreach-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // Fetch lead with its latest diagnostic
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        diagnostics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!lead || !lead.diagnostics?.length) {
      return NextResponse.json({ error: 'Lead or diagnostic not found' }, { status: 404 });
    }

    const diag = lead.diagnostics[0];
    const audit = diag.websiteAudit as any;
    const opps = diag.opportunities as any;

    if (!audit || !opps) {
      return NextResponse.json({ error: 'Diagnostic data incomplete' }, { status: 400 });
    }

    const draft = await outreachGenerator.generateDraft({
      leadId: lead.id,
      companyName: lead.company,
      website: lead.website || "",
      opportunityType: opps.type,
      serviceAngle: opps.service,
      evidence: audit.evidenceLog || [],
      confidence: opps.confidence || "MEDIUM"
    });

    return NextResponse.json(draft);
  } catch (err: any) {
    console.error('Draft POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { editedSubject, editedBody, status } = body;

    const draft = await prisma.outreachDraft.update({
      where: { leadId: id },
      data: {
        editedSubject,
        editedBody,
        status: status === 'SENT' ? 'SENT' as any : 'EDITED' as any,
        lastSentSubject: status === 'SENT' ? editedSubject : undefined,
        lastSentVersion: status === 'SENT' ? editedBody : undefined,
        sentAt: status === 'SENT' ? new Date() : undefined
      }
    });

    return NextResponse.json(draft);
  } catch (err: any) {
    console.error('Draft PATCH Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
