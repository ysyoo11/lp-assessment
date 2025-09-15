import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { headers } from 'next/headers';

export async function rateLimitByIp(rateLimit: Ratelimit) {
  const ip = await getIpAddress();
  return await rateLimit.limit(ip);
}

async function getIpAddress() {
  return (await headers()).get('x-forwarded-for') ?? 'unknown';
}
