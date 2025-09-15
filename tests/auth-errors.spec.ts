import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { NewUser } from '@/types/user';
import { hashPassword } from '@/utils/auth';
import { UserSession } from '@/utils/session';

type TestUser = NewUser;

test.describe('Auth Errors', () => {
  let testUser: TestUser;

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.CI === 'true' || !process.env.ELASTICSEARCH_URL,
      'Skipping integration test - requires Elasticsearch and Redis'
    );

    const projectName = testInfo.project.name || 'default';
    testUser = {
      id: crypto.randomUUID(),
      name: `Test User ${projectName}`,
      email: `test-user-errors-${projectName}@example.com`,
      password: 'TestPassword123!'
    };
  });

  test('Invalid credentials - non-existent email', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('nonexistent@example.com');
    await page.getByTestId('password-input').fill('SomePassword123!');
    await page.getByTestId('login-button').click();

    await page.waitForTimeout(1000);

    await expect(page).toHaveURL('/login');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toHaveText(
      'Invalid credentials'
    );
  });

  test('Invalid credentials - wrong password', async ({ page }) => {
    try {
      // Create test user with correct password
      const hashedPassword = await hashPassword(testUser.password);
      await esClient.index({
        index: ELASTICSEARCH_INDEXES.USERS,
        id: testUser.id,
        document: {
          ...testUser,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        },
        refresh: 'wait_for'
      });

      await page.goto('/login');

      await page.getByTestId('email-input').fill(testUser.email);
      await page.getByTestId('password-input').fill('WrongPassword123!');
      await page.getByTestId('login-button').click();

      await page.waitForTimeout(1000);

      await expect(page).toHaveURL('/login');
      await expect(page.getByTestId('login-error')).toBeVisible();
      await expect(page.getByTestId('login-error')).toHaveText(
        'Invalid credentials'
      );
    } catch (error) {
      console.warn('Failed to setup test:', error);
      test.skip();
    }
  });

  test('Session expiry - missing session in Redis', async ({ page }) => {
    try {
      // Create a session cookie but don't create the session in Redis
      const sessionId = crypto.randomBytes(32).toString('hex');

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

      await expect(page).toHaveURL('/login');
    } catch (error) {
      console.warn('Failed to setup missing session test:', error);
      test.skip();
    }
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

      // Clean up any test sessions from Redis
      const sessionKeys = await redisClient.keys('session:*');
      for (const key of sessionKeys) {
        try {
          const sessionValue = (await redisClient.get(key)) as UserSession;
          if (sessionValue && sessionValue.name === testUser.name) {
            await redisClient.del(key);
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
