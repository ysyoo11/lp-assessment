import { cookies } from 'next/headers';
import z from 'zod';

import { COOKIE_SESSION_KEY } from '@/constants/session';
import { redisClient } from '@/lib/redis';

const sessionSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type UserSession = z.infer<typeof sessionSchema>;

/**
 * Edge Runtime compatible version of getCurrentUser
 * This function doesn't use crypto module, making it safe for middleware
 */
export async function getCurrentUserEdge(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;
  return sessionId != null ? getUserSessionById(sessionId) : null;
}

async function getUserSessionById(
  sessionId: string
): Promise<UserSession | null> {
  const rawUser = await redisClient.get(`session:${sessionId}`);

  const { success, data: user } = sessionSchema.safeParse(rawUser);

  return success ? user : null;
}
