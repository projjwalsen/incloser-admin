import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Hash a plain password for storing in `admin_users.password_hash`. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

/** Compare a login password with a stored bcrypt hash. */
export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compareSync(plain, passwordHash);
}
