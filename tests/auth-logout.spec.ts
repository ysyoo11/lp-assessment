import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { NewUser } from '@/types/user';
import { hashPassword } from '@/utils/auth';
import { UserSession } from '@/utils/session';

type TestUser = NewUser;

test.describe('Log out', () => {
  let testUser: TestUser;
  let sessionId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    // Skip this test if external services are not available
    test.skip(
      process.env.CI === 'true' || !process.env.ELASTICSEARCH_URL,
      'Skipping integration test - requires Elasticsearch and Redis'
    );

    // Create unique test user for each browser to avoid conflicts in parallel execution
    const projectName = testInfo.project.name || 'default';
    testUser = {
      id: crypto.randomUUID(),
      name: `Test User ${projectName}`,
      email: `test-user-logout-${projectName}@example.com`,
      password: 'TestPassword123!'
    };

    try {
      // Create test user in Elasticsearch
      const hashedPassword = await hashPassword(testUser.password);
      await esClient.index({
        index: 'users',
        id: testUser.id,
        document: {
          ...testUser,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        },
        refresh: 'wait_for'
      });

      // Create session in Redis
      sessionId = crypto.randomBytes(32).toString('hex');
      const userSession: UserSession = {
        id: testUser.id,
        name: testUser.name
      };

      await redisClient.set(`session:${sessionId}`, userSession, {
        ex: 3600 // 1 hour
      });

      // Set session cookie in browser
      await page.context().addCookies([
        {
          name: 'session-id',
          value: sessionId,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax'
        }
      ]);

      await page.goto('/');
    } catch (error) {
      console.warn('Failed to setup test:', error);
      test.skip();
    }
  });

  test('Logout functionality properly clears session/tokens', async ({
    page
  }) => {
    await expect(page.getByTestId('logout-button')).toBeVisible();

    await page.getByTestId('logout-button').click();

    await page.waitForTimeout(2000);

    await expect(page).toHaveURL('/login');

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === 'session-id'
    );
    expect(sessionCookie).toBeFalsy();

    const sessionValue = await redisClient.get(`session:${sessionId}`);
    expect(sessionValue).toBeNull();

    console.log('✓ Logout successful: session cleared from cookie and Redis');
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

      // Clean up test user sessions from Redis
      if (sessionId) {
        await redisClient.del(`session:${sessionId}`);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });
});
