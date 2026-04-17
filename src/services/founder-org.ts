import { prisma } from "@/lib/prisma";

/**
 * Helper to get or create the founder's organization.
 * Since this is an internal-only tool, we use a single organization.
 */
export async function getFounderOrg() {
  const orgSlug = "founder-internal";
  
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Founder Hub",
        slug: orgSlug,
      },
    });
  }

  return org;
}

/**
 * Helper to get the founder's user ID.
 * Minimizes auth logic for now.
 */
export async function getFounderUser() {
  const org = await getFounderOrg();
  
  const userEmail = "founder@outpipe.com";
  
  let user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: "Founder",
        organizationId: org.id,
      },
    });
  }

  return user;
}
