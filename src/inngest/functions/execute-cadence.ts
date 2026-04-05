import { inngest } from "../client";

// ═══════════════════════════════════════════
// FUNÇÃO: Executar Cadência de Prospecção
// ═══════════════════════════════════════════
// Quando um lead é inscrito numa campanha, esta função
// executa cada passo da cadência respeitando os delays.
//
// Fluxo: Lead inscrito → Passo 1 (email) → espera 2 dias →
//        Passo 2 (LinkedIn) → espera 3 dias → Passo 3 (WhatsApp)...

export const executeCadence = inngest.createFunction(
  {
    id: "execute-cadence",
    name: "Executar Cadência de Prospecção",
    // Se falhar, tenta de novo até 3 vezes com backoff
    retries: 3,
  },
  { event: "campaign/lead.enrolled" },
  async ({ event, step }) => {
    const { campaignLeadId, campaignId, leadId } = event.data;

    // Passo 1: Buscar os steps da cadência
    const cadenceSteps = await step.run("fetch-cadence-steps", async () => {
      // TODO: Importar prisma e buscar os steps
      // const steps = await prisma.cadenceStep.findMany({
      //   where: { campaignId },
      //   orderBy: { order: "asc" },
      // });
      // return steps;
      return []; // placeholder
    });

    // Passo 2: Executar cada step com delay
    for (const cadenceStep of cadenceSteps) {
      // Esperar o delay configurado (em dias)
      if (cadenceStep.delayDays > 0) {
        await step.sleep(
          `wait-${cadenceStep.order}-${cadenceStep.delayDays}d`,
          `${cadenceStep.delayDays}d`
        );
      }

      // Verificar se o lead respondeu (se sim, parar a cadência)
      const shouldContinue = await step.run(
        `check-reply-step-${cadenceStep.order}`,
        async () => {
          // TODO: Checar no banco se o lead respondeu
          // const enrollment = await prisma.campaignLead.findUnique({
          //   where: { id: campaignLeadId },
          // });
          // return enrollment?.status === "ACTIVE";
          return true; // placeholder
        }
      );

      if (!shouldContinue) {
        return { status: "stopped", reason: "lead_replied" };
      }

      // Executar a ação do step (email, LinkedIn, WhatsApp)
      await step.run(`execute-step-${cadenceStep.order}`, async () => {
        switch (cadenceStep.channel) {
          case "EMAIL":
            // TODO: Gerar copy com IA + enviar email via SMTP
            // await generateAndSendEmail(leadId, cadenceStep);
            break;
          case "WHATSAPP":
            // TODO: Enviar via Evolution API
            // await sendWhatsAppMessage(leadId, cadenceStep);
            break;
          case "LINKEDIN_VISIT":
          case "LINKEDIN_CONNECT":
          case "LINKEDIN_MESSAGE":
            // TODO: Agendar ação na extensão Chrome
            // await queueLinkedInAction(leadId, cadenceStep);
            break;
          case "INSTAGRAM_DM":
            // TODO: Enviar DM
            break;
        }
      });

      // Atualizar o passo atual no banco
      await step.run(`update-progress-${cadenceStep.order}`, async () => {
        // TODO:
        // await prisma.campaignLead.update({
        //   where: { id: campaignLeadId },
        //   data: { currentStep: cadenceStep.order },
        // });
      });
    }

    // Cadência completa
    return { status: "completed" };
  }
);
