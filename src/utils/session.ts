import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import z from 'zod';

import {
  COOKIE_SESSION_KEY,
  SESSION_EXPIRATION_SECONDS
} from '@/constants/session';
import { redisClient } from '@/lib/redis';

import { isProduction } from './env';

const sessionSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type UserSession = z.infer<typeof sessionSchema>;

export async function getUserFromSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;
  return sessionId != null ? getUserSessionById(sessionId) : null;
}

export async function createUserSession(user: UserSession) {
  const sessionId = crypto.randomBytes(512).toString('hex').normalize();
  await redisClient.set(`session:${sessionId}`, sessionSchema.parse(user), {
    ex: SESSION_EXPIRATION_SECONDS
  });
  await setCookie(sessionId);
}

export async function removeUserFromSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  await redisClient.del(`session:${sessionId}`);
  cookieStore.delete(COOKIE_SESSION_KEY);
}

async function setCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSION_KEY, sessionId, {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    expires: Date.now() + SESSION_EXPIRATION_SECONDS * 1000
  });
}

async function getUserSessionById(
  sessionId: string
): Promise<UserSession | null> {
  const rawUser = await redisClient.get(`session:${sessionId}`);

  const { success, data: user } = sessionSchema.safeParse(rawUser);

  return success ? user : null;
}
