import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 500,
  }
});

export interface OutreachContext {
  leadId: string;
  companyName: string;
  website: string;
  opportunityType: string;
  serviceAngle: string;
  evidence: Array<{ label: string; status: string; reason: string }>;
  confidence: string;
}

export class OutreachGenerator {
  /**
   * Generates a primary outreach draft and a short follow-up.
   */
  async generateDraft(context: OutreachContext) {
    const negativeEvidence = context.evidence
      .filter(e => e.status === 'NEGATIVE')
      .map(e => e.reason)
      .join("\n- ");

    const prompt = `
      You are an independent full-stack developer (use "I" only, NEVER "we" or "team"). 
      Write a short, high-credibility outreach email to the owner of ${context.companyName}.
      
      CONTEXT:
      - Website: ${context.website}
      - Target Opportunity: ${context.opportunityType}
      - Service Angle: ${context.serviceAngle}
      - Found Evidence: ${negativeEvidence}
      
      STRICT RULES:
      - Tone: "Technically helpful neighbor / individual developer".
      - Perspective: Sole individual (Freelancer). 
      - Single Angle: Pick the ONE most impactful commercial gap from the evidence. Do NOT list multiple problems.
      - Opener: Direct entry (no "hope you're well").
      - Header: Observational feel. Lowercase subject lines.
      - Brevity: Body UNDER 40 words.
      - confidence: ${context.confidence}.
      
      OUTPUT FORMAT (JSON):
      {
        "subject": "lowercase, 2-4 words, specific to THAT ONE gap",
        "body": "The extremely short body text",
        "followUp": "One short sentence for 3 days later"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Basic JSON cleaning if needed
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.substring(jsonStart, jsonEnd);
      
      const draft = JSON.parse(jsonStr);

      // Store in DB
      const record = await prisma.outreachDraft.upsert({
        where: { leadId: context.leadId },
        update: {
          subject: draft.subject,
          body: draft.body,
          followUp: draft.followUp,
          status: 'GENERATED' as any
        },
        create: {
          leadId: context.leadId,
          organizationId: (await prisma.lead.findUnique({ where: { id: context.leadId } }))?.organizationId || "",
          subject: draft.subject,
          body: draft.body,
          followUp: draft.followUp,
          status: 'GENERATED' as any
        }
      });

      return record;
    } catch (error) {
      console.error("[OutreachGenerator] Error:", error);
      throw error;
    }
  }
}

export const outreachGenerator = new OutreachGenerator();
