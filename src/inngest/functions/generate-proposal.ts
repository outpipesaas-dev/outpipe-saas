import { inngest } from "../client";

// ═══════════════════════════════════════════
// FUNÇÃO: Gerar Proposta Comercial com IA
// ═══════════════════════════════════════════
// Após o diagnóstico estar completo, esta função
// gera automaticamente uma proposta comercial
// personalizada usando IA.
//
// Inspiração: "Cria uma proposta comercial personalizada
// para essa clínica, usando as cores da marca, diagnóstico
// do estado atual, solução proposta, estimativa de ROI
// e investimento mensal."

export const generateProposal = inngest.createFunction(
  {
    id: "generate-proposal",
    name: "Gerar Proposta Comercial",
    retries: 2,
  },
  { event: "proposal/generate" },
  async ({ event, step }) => {
    const { proposalId, leadId, diagnosticId } = event.data;

    // ── Etapa 1: Buscar dados do diagnóstico e do lead ──
    const context = await step.run("fetch-context", async () => {
      // TODO:
      // const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      // const diagnostic = await prisma.diagnostic.findUnique({
      //   where: { id: diagnosticId },
      // });
      // return { lead, diagnostic };
      return { lead: null, diagnostic: null }; // placeholder
    });

    // ── Etapa 2: Gerar conteúdo da proposta com IA ──
    const proposalContent = await step.run("generate-content", async () => {
      // TODO: Prompt para GPT-4o/Claude:
      //
      // "Com base neste diagnóstico de presença online, gere uma
      //  proposta comercial completa em JSON com as seguintes seções:
      //
      //  1. DIAGNÓSTICO: Estado atual da presença digital
      //     (pontos fortes e fracos encontrados)
      //
      //  2. SOLUÇÃO PROPOSTA: O que você vai entregar
      //     (site novo, automação WhatsApp, agentes de IA, etc.)
      //
      //  3. ESTIMATIVA DE ROI: Quanto o cliente pode ganhar
      //     (ex: 'Atualmente você perde ~30% dos contatos por
      //     demora no atendimento. Com automação, recuperar
      //     20% = R$ X.XXX/mês adicional')
      //
      //  4. INVESTIMENTO: Tabela com planos/preços
      //
      //  5. CRONOGRAMA: Timeline de implementação
      //
      //  Use as cores da marca se disponíveis nos dados.
      //  Tom: consultivo, baseado em dados, sem ser agressivo.
      //
      //  Dados do lead: ${JSON.stringify(context.lead)}
      //  Diagnóstico: ${JSON.stringify(context.diagnostic)}"

      return {
        sections: [
          {
            type: "diagnostic",
            title: "Diagnóstico da Presença Digital",
            content: "placeholder",
          },
          {
            type: "solution",
            title: "Solução Proposta",
            content: "placeholder",
          },
          {
            type: "roi",
            title: "Estimativa de Retorno",
            content: "placeholder",
          },
          {
            type: "investment",
            title: "Investimento",
            content: "placeholder",
          },
          {
            type: "timeline",
            title: "Cronograma",
            content: "placeholder",
          },
        ],
        brandColors: null,
      };
    });

    // ── Etapa 3: Salvar proposta no banco ──
    await step.run("save-proposal", async () => {
      // TODO:
      // await prisma.proposal.update({
      //   where: { id: proposalId },
      //   data: {
      //     status: "READY",
      //     content: proposalContent,
      //   },
      // });
    });

    return { proposalId, status: "ready" };
  }
);
