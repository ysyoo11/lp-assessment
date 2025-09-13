import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import z from 'zod';

import { redisClient } from '@/lib/redis';

export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const COOKIE_SESSION_KEY = 'session-id';

const sessionSchema = z.object({
  id: z.string(),
  name: z.string()
});

type UserSession = z.infer<typeof sessionSchema>;

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

async function setCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSION_KEY, sessionId, {
    secure: true,
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
