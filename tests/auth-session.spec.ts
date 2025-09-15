import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { redisClient } from '@/lib/redis';
import { UserSession } from '@/utils/session';

test.describe('Session Management', () => {
  let sessionId: string;
  let mockUser: UserSession;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.CI === 'true' || !process.env.REDIS_URL,
      'Skipping integration test - requires Redis'
    );

    const projectName = testInfo.project.name || 'default';

    // Create mock user data
    mockUser = {
      id: crypto.randomUUID(),
      name: `Mock User Session ${projectName}`
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
    } catch (error) {
      console.warn('Failed to setup session test:', error);
      test.skip();
    }
  });

  test('User session persists across page refreshes', async ({ page }) => {
    // Navigate to the protected home page
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Verify we're authenticated and on the home page
    await expect(page.getByTestId('logout-button')).toBeVisible();

    // Verify session cookie exists
    const initialCookies = await page.context().cookies();
    const initialSessionCookie = initialCookies.find(
      (cookie) => cookie.name === 'session-id'
    );
    expect(initialSessionCookie).toBeTruthy();
    expect(initialSessionCookie!.value).toBe(sessionId);

    // Verify session exists in Redis
    const initialSessionValue = (await redisClient.get(
      `session:${sessionId}`
    )) as UserSession;
    expect(initialSessionValue).toBeTruthy();
    expect(initialSessionValue.id).toBe(mockUser.id);
    expect(initialSessionValue.name).toBe(mockUser.name);

    // Refresh the page
    await page.reload();

    // Verify we're still authenticated after refresh
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('logout-button')).toBeVisible();

    // Verify session cookie persists after refresh
    const refreshedCookies = await page.context().cookies();
    const refreshedSessionCookie = refreshedCookies.find(
      (cookie) => cookie.name === 'session-id'
    );
    expect(refreshedSessionCookie).toBeTruthy();
    expect(refreshedSessionCookie!.value).toBe(sessionId);

    // Verify session still exists in Redis
    const refreshedSessionValue = (await redisClient.get(
      `session:${sessionId}`
    )) as UserSession;
    expect(refreshedSessionValue).toBeTruthy();
    expect(refreshedSessionValue.id).toBe(mockUser.id);
    expect(refreshedSessionValue.name).toBe(mockUser.name);
  });

  test('Session persists when opening new tab/window', async ({ context }) => {
    // Create initial page and verify session
    const page1 = await context.newPage();
    await page1.goto('/');
    await expect(page1).toHaveURL('/');

    // Open new tab/page in same context (shares cookies)
    const page2 = await context.newPage();
    await page2.goto('/');

    // Both pages should be authenticated
    await expect(page1).toHaveURL('/');
    await expect(page2).toHaveURL('/');

    // Verify both pages have the session
    const cookies1 = await page1.context().cookies();
    const cookies2 = await page2.context().cookies();

    const sessionCookie1 = cookies1.find(
      (cookie) => cookie.name === 'session-id'
    );
    const sessionCookie2 = cookies2.find(
      (cookie) => cookie.name === 'session-id'
    );

    expect(sessionCookie1).toBeTruthy();
    expect(sessionCookie2).toBeTruthy();
    expect(sessionCookie1!.value).toBe(sessionCookie2!.value);
    expect(sessionCookie1!.value).toBe(sessionId);

    await page1.close();
    await page2.close();
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
