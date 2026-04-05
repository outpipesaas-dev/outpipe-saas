import { PrismaClient } from "@/generated/prisma";

// Singleton pattern para evitar múltiplas conexões em dev
// (Hot reload do Next.js cria novas instâncias a cada save)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
