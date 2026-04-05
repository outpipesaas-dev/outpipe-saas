import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  executeCadence,
  runDiagnostic,
  generateProposal,
} from "@/inngest/index";

// Esta rota é o ponto de entrada do Inngest no Next.js.
// O Inngest Dev Server (ou Cloud) envia webhooks para cá.
//
// Para rodar em dev:
//   Terminal 1: npm run dev
//   Terminal 2: npx inngest-cli@latest dev
//
// O Inngest Dev Server encontra esta rota automaticamente
// em http://localhost:3000/api/inngest

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeCadence, runDiagnostic, generateProposal],
});
