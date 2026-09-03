import bcrypt from "bcrypt";
const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string) {
  return bcrypt.hash(token, SALT_ROUNDS);
}

export function verifyTokenHash(token: string, hash: string) {
  return bcrypt.compare(token, hash);
}
