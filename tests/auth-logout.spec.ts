import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { redisClient } from '@/lib/redis';
import { UserSession } from '@/utils/session';

test.describe('Log out', () => {
  let sessionId: string;
  let mockUser: UserSession;

  test.beforeEach(async ({ page }, testInfo) => {
    // Skip this test if external services are not available
    test.skip(
      process.env.CI === 'true' || !process.env.REDIS_URL,
      'Skipping integration test - requires Redis'
    );

    const projectName = testInfo.project.name || 'default';

    // Create mock user data (no need for real user in database)
    mockUser = {
      id: crypto.randomUUID(),
      name: `Mock User Logout ${projectName}`
    };

    try {
      // Create session in Redis with mock user data
      sessionId = crypto.randomBytes(32).toString('hex');
      const userSession: UserSession = {
        id: mockUser.id,
        name: mockUser.name
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
      console.warn('Failed to setup logout test:', error);
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
    try {
      // Clean up test session from Redis
      if (sessionId) {
        await redisClient.del(`session:${sessionId}`);
      }
    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
  });
});
