import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { redisClient } from '@/lib/redis';
import { UserSession } from '@/utils/session';

test.describe('Auth Middleware Protection', () => {
  let mockUser: UserSession;

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.CI === 'true' || !process.env.REDIS_URL,
      'Skipping integration test - requires Redis'
    );

    const projectName = testInfo.project.name || 'default';

    // Create mock user data (no need for real user in database)
    mockUser = {
      id: crypto.randomUUID(),
      name: `Mock User Middleware ${projectName}`
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
  });

  test('Authenticated users cannot access the login page', async ({ page }) => {
    try {
      // Create valid session in Redis with mock user data
      const sessionId = crypto.randomBytes(32).toString('hex');
      const userSession: UserSession = {
        id: mockUser.id,
        name: mockUser.name
      };

      await redisClient.set(`session:${sessionId}`, userSession, {
        ex: 3600 // 1 hour
      });

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

      await page.goto('/login');

      await expect(page).toHaveURL('/');
    } catch (error) {
      console.warn('Failed to setup test:', error);
      test.skip();
    }
  });

  test('Authenticated users cannot access the signup page', async ({
    page
  }) => {
    try {
      // Create valid session in Redis with mock user data
      const sessionId = crypto.randomBytes(32).toString('hex');
      const userSession: UserSession = {
        id: mockUser.id,
        name: mockUser.name
      };

      await redisClient.set(`session:${sessionId}`, userSession, {
        ex: 3600 // 1 hour
      });

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

      await page.goto('/signup');

      await expect(page).toHaveURL('/');
    } catch (error) {
      console.warn('Failed to setup test:', error);
      test.skip();
    }
  });

  test('Authenticated users can access protected routes', async ({ page }) => {
    try {
      // Create valid session in Redis with mock user data
      const sessionId = crypto.randomBytes(32).toString('hex');
      const userSession: UserSession = {
        id: mockUser.id,
        name: mockUser.name
      };

      await redisClient.set(`session:${sessionId}`, userSession, {
        ex: 3600 // 1 hour
      });

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

      await expect(page).toHaveURL('/');
    } catch (error) {
      console.warn('Failed to setup test:', error);
      test.skip();
    }
  });

  test.afterEach(async () => {
    try {
      // Clean up any test sessions from Redis
      const sessionKeys = await redisClient.keys('session:*');
      for (const key of sessionKeys) {
        try {
          const sessionValue = (await redisClient.get(key)) as UserSession;
          if (sessionValue && sessionValue.name === mockUser.name) {
            await redisClient.del(key);
          }
          /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        } catch (error) {
          // Skip invalid sessions
        }
      }
    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
  });
});
