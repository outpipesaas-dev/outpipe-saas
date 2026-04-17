
const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient({ log: ['info'] });

async function main() {
  try {
    const jobs = await prisma.scrapeJob.findMany({ take: 1 });
    console.log("SUCCESS:", jobs);
  } catch (err) {
    console.error("FAILURE:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
