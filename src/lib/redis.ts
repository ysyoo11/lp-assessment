import { Redis } from '@upstash/redis';

import { ENV } from '@/utils/env';

export const redisClient = new Redis({
  url: ENV.REDIS_URL,
  token: ENV.REDIS_TOKEN
});
