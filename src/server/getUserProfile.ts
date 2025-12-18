import { prisma } from "@/server/prisma";

export async function getUserProfile(userId: string | null | undefined) {
  if (!userId) return null;

  return await prisma.profile.findUnique({
    where: { userId },
  });
}
