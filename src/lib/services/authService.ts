import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  // Support legacy plain text passwords
  if (hash.startsWith("$2")) {
    return bcrypt.compare(plain, hash);
  }
  // Legacy: direct comparison
  return hash === plain;
}

export async function migratePasswordIfNeeded(
  userId: number,
  plainPassword: string,
  currentHash: string,
): Promise<void> {
  // If still plain text, upgrade to bcrypt
  if (!currentHash.startsWith("$2")) {
    const newHash = await hashPassword(plainPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });
  }
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { Role: true, Sector: true },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: { Role: true, Sector: true },
  });
}

/**
 * Sanitize user object for API response — strips password_hash
 */
export function sanitizeUser(user: any) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

export const DEFAULT_PASSWORD = "Mudar@123";
