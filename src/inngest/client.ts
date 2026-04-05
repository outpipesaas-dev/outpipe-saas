import { Inngest } from "inngest";

// Cliente Inngest — usado por toda a aplicação
// Em dev: roda com `npx inngest-cli@latest dev`
// Em prod: conecta automaticamente ao Inngest Cloud
export const inngest = new Inngest({
  id: "outpipe",
  name: "OutPipe",
});
