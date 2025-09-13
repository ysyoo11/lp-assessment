import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { User } from '@/types/user';
import { hashPassword } from '@/utils/auth';
import { UserSession } from '@/utils/session';

type TestUser = Omit<User, 'createdAt'>;

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
        index: 'users',
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
      const sessionKeys = await redisClient.keys('session:*');
      for (const key of sessionKeys) {
        try {
          const sessionValue = (await redisClient.get(key)) as UserSession;
          if (sessionValue) {
            if (sessionValue.name === testUser.name) {
              await redisClient.del(key);
            }
          }
        } catch (error) {
          // Skip invalid sessions
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  test('Successfully log in and redirect to the main application and create a session', async ({
    page
  }) => {
    // Fill in the login form
    await page.getByTestId('email-input').fill(testUser.email);
    await page.getByTestId('password-input').fill(testUser.password);

    // Click the login button
    await page.getByTestId('login-button').click();

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Check current URL and look for errors
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      // Check for error messages
      const errorElement = await page
        .getByTestId('login-error')
        .isVisible()
        .catch(() => false);
      if (errorElement) {
        const errorText = await page.getByTestId('login-error').textContent();
        console.log(`Login error found: ${errorText}`);
      }

      // Also check for field errors
      const emailError = await page
        .getByTestId('email-error')
        .isVisible()
        .catch(() => false);
      const passwordError = await page
        .getByTestId('password-error')
        .isVisible()
        .catch(() => false);

      if (emailError) {
        const emailErrorText = await page
          .getByTestId('email-error')
          .textContent();
        console.log(`Email error: ${emailErrorText}`);
      }

      if (passwordError) {
        const passwordErrorText = await page
          .getByTestId('password-error')
          .textContent();
        console.log(`Password error: ${passwordErrorText}`);
      }
    }

    // Verify successful redirect to main application
    await expect(page).toHaveURL('/');

    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === 'session-id'
    );
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.value).toBeTruthy();

    // Verify session is properly stored in Redis
    const sessionValue = (await redisClient.get(
      `session:${sessionCookie!.value}`
    )) as UserSession;
    expect(sessionValue).toBeTruthy();

    expect(sessionValue.name).toBe(testUser.name);
    expect(sessionValue.id).toBe(testUser.id);

    console.log('✓ Login successful: redirect + session creation verified');
  });
});
