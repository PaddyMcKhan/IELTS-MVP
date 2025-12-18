import { prisma } from "@/lib/prisma";

export async function getUserProfile(userId: string) {
  if (!userId) return null;

  return await prisma.userProfile.findUnique({
  where: { userId },
});
}
