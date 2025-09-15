import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { STORAGE_KEYS } from '@/constants/storage';
import { redisClient } from '@/lib/redis';
import { UserSession } from '@/utils/session';

test.describe('Form Persistence', () => {
  let sessionId: string;
  let mockUser: UserSession;

  test.beforeEach(async ({ page }, testInfo) => {
    // Skip this test if external services are not available
    test.skip(
      process.env.CI === 'true' || !process.env.REDIS_URL,
      'Skipping integration test - requires Redis'
    );

    // Create unique mock user for each browser to avoid conflicts in parallel execution
    const projectName = testInfo.project.name || 'default';
    mockUser = {
      id: crypto.randomUUID(),
      name: `Test User ${projectName}`
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
          secure: false,
          sameSite: 'Lax'
        }
      ]);
    } catch (error) {
      console.warn('Failed to create test session:', error);
      test.skip();
    }

    await page.goto('/');
  });

  test('should persist form data after page refresh', async ({ page }) => {
    await page.getByTestId('postcode-input').focus();
    await page.getByTestId('postcode-input').clear();
    await page.getByTestId('postcode-input').fill('2000');

    await page.getByTestId('suburb-input').focus();
    await page.getByTestId('suburb-input').clear();
    await page.getByTestId('suburb-input').fill('Sydney');

    await page.getByTestId('state-dropdown-trigger').click();
    await page.getByTestId('state-dropdown-item-VIC').click();

    await page.waitForTimeout(500);
    const localStorageData = await page.evaluate((storageKey) => {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }, STORAGE_KEYS.VERIFIER_FORM_DATA);

    expect(localStorageData).toEqual({
      postcode: '2000',
      suburb: 'Sydney',
      state: 'VIC'
    });

    await page.reload();

    await expect(page.getByTestId('postcode-input')).toHaveValue('2000');
    await expect(page.getByTestId('suburb-input')).toHaveValue('Sydney');
    await expect(page.getByTestId('state-dropdown-trigger')).toContainText(
      'VIC'
    );
  });

  test('should clear form data from localStorage when logging out', async ({
    page
  }) => {
    await page.getByTestId('postcode-input').focus();
    await page.getByTestId('postcode-input').clear();
    await page.getByTestId('postcode-input').fill('4000');

    await page.getByTestId('suburb-input').focus();
    await page.getByTestId('suburb-input').clear();
    await page.getByTestId('suburb-input').fill('Brisbane');

    await page.getByTestId('state-dropdown-trigger').click();
    await page.getByTestId('state-dropdown-item-WA').click();

    await page.waitForTimeout(500);
    const localStorageDataBefore = await page.evaluate((storageKey) => {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }, STORAGE_KEYS.VERIFIER_FORM_DATA);

    expect(localStorageDataBefore).toEqual({
      postcode: '4000',
      suburb: 'Brisbane',
      state: 'WA'
    });

    await page.getByTestId('logout-button').click();

    await page.waitForURL('/login');
    const localStorageDataAfter = await page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey);
    }, STORAGE_KEYS.VERIFIER_FORM_DATA);

    expect(localStorageDataAfter).toBeNull();
  });

  test('should handle invalid localStorage data gracefully', async ({
    page
  }) => {
    await page.evaluate((storageKey) => {
      localStorage.setItem(storageKey, 'invalid-json');
    }, STORAGE_KEYS.VERIFIER_FORM_DATA);

    await page.reload();
    await page.waitForTimeout(100);
    await expect(page.getByTestId('postcode-input')).toHaveValue('');
    await expect(page.getByTestId('suburb-input')).toHaveValue('');
    await expect(page.getByTestId('state-dropdown-trigger')).toContainText(
      'NSW'
    );

    await page.waitForTimeout(500);
    const localStorageData = await page.evaluate((storageKey) => {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }, STORAGE_KEYS.VERIFIER_FORM_DATA);

    expect(localStorageData).toEqual({
      postcode: '',
      suburb: '',
      state: 'NSW'
    });
  });

  test.afterEach(async () => {
    // Clean up session from Redis
    if (sessionId) {
      try {
        await redisClient.del(`session:${sessionId}`);
      } catch (error) {
        console.warn('Failed to clean up test session:', error);
      }
    }
  });
});
