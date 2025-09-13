import bcrypt from 'bcryptjs';

import { ENV } from './env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, Number(ENV.BCRYPT_SALT_ROUNDS));
}

export async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
