import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { NewUser } from '@/types/user';
import { hashPassword } from '@/utils/auth';
import { UserSession } from '@/utils/session';

type TestUser = NewUser;

test.describe('Log in', () => {
  let testUser: TestUser;

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
      email: `test-user-${projectName}@example.com`,
      password: 'TestPassword123!'
    };

    try {
      const hashedPassword = await hashPassword(testUser.password);

      await esClient.index({
        index: ELASTICSEARCH_INDEXES.USERS,
        id: testUser.id,
        document: {
          ...testUser,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        },
        refresh: 'wait_for' // Wait for indexing to complete
      });
    } catch (error) {
      console.warn('Failed to create test user:', error);
      test.skip();
    }

    await page.goto('/login');
  });

  test('Successfully log in and redirect to the main application and create a session', async ({
    page
  }) => {
    await page.getByTestId('email-input').fill(testUser.email);
    await page.getByTestId('password-input').fill(testUser.password);

    await page.getByTestId('login-button').click();

    await page.waitForTimeout(2000);

    await expect(page).toHaveURL('/');

    // Verify session cookie was created (this is the main proof of successful login)
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === 'session-id'
    );
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.value).toBeTruthy();

    // Verify the home page content is visible (user is authenticated)
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });

  test.afterEach(async () => {
    if (!testUser) return;

    try {
      // Clean up test user from Elasticsearch
      await esClient.deleteByQuery({
        index: ELASTICSEARCH_INDEXES.USERS,
        query: {
          term: {
            email: testUser.email
          }
        },
        conflicts: 'proceed'
      });

      // Clean up test user sessions from Redis
      const sessionKeys = await redisClient.keys('session:*');
      for (const key of sessionKeys) {
        try {
          const sessionValue = (await redisClient.get(key)) as UserSession;
          if (sessionValue) {
            if (sessionValue.name === testUser.name) {
              await redisClient.del(key);
            }
          }
          /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        } catch (error) {
          // Skip invalid sessions
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });
});
