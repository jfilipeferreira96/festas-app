import prisma from "@festas/db";

/**
 * Check if a user exists in the database
 */
export async function checkUserExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}

/**
 * Get a user by ID, throwing if not found
 */
export async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}
