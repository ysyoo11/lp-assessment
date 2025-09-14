import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { NewUser } from '@/types/user';
import { UserSession } from '@/utils/session';

type TestUser = NewUser;

test.describe('Auth Middleware Protection', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.CI === 'true' || !process.env.ELASTICSEARCH_URL,
      'Skipping integration test - requires Elasticsearch and Redis'
    );

    const projectName = testInfo.project.name || 'default';
    testUser = {
      id: crypto.randomUUID(),
      name: `Test User Middleware ${projectName}`,
      email: `test-user-middleware-${projectName}@example.com`,
      password: 'TestPassword123!'
    };
  });

  test('Users cannot access the Verifier form ("/") without logging in', async ({
    page
  }) => {
    await page.context().clearCookies();

    await page.goto('/');

    await expect(page).toHaveURL('/login');

    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-button')).toBeVisible();

    console.log('✓ Unauthenticated user redirected from "/" to "/login"');
  });

  test('Users with invalid/expired session are redirected to login', async ({
    page
  }) => {
    // Set an invalid session cookie
    await page.context().addCookies([
      {
        name: 'session-id',
        value: 'invalid-session-id',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      }
    ]);

    await page.goto('/');

    await expect(page).toHaveURL('/login');

    console.log('✓ Invalid session redirected from "/" to "/login"');
  });

  test.afterEach(async () => {
    if (!testUser) return;

    try {
      // Clean up test user from Elasticsearch
      await esClient.deleteByQuery({
        index: 'users',
        query: {
          term: {
            'email.keyword': testUser.email
          }
        },
        conflicts: 'proceed'
      });

      // Clean up any test sessions from Redis
      const sessionKeys = await redisClient.keys('session:*');
      for (const key of sessionKeys) {
        try {
          const sessionValue = (await redisClient.get(key)) as UserSession;
          if (sessionValue && sessionValue.name === testUser.name) {
            await redisClient.del(key);
          }
        } catch (error) {
          // Skip invalid sessions
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });
});
