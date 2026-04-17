import { inngest } from "../client";
import { diagnosticService } from "@/services/diagnostic";

/**
 * FUNÇÃO: Diagnóstico Comercial (Founder Edition)
 * Analisa tecnicamente o site do lead em busca de falhas de conversão (Gaps).
 */
export const runDiagnostic = inngest.createFunction(
  {
    id: "run-diagnostic",
    name: "Commercial Opportunity Scan",
    retries: 1,
  },
  { event: "diagnostic/requested" },
  async ({ event, step }) => {
    const { leadId, website } = event.data;

    if (!website) {
       return { status: "skipped", reason: "no_website" };
    }

    // ── Etapa 1: Scan Determinístico com Playwright ──
    const commercialScan = await step.run("scan-commercial-signals", async () => {
      return await diagnosticService.analyzeWebsite(leadId, website);
    });

    // ── Etapa 2: Consolidação do Score Comercial ──
    // (Poderia usar LLM aqui depois se o scan for inconclusivo)

    return {
      leadId,
      status: "completed",
      signals: commercialScan
    };
  }
);
