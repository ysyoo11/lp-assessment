import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { redisClient } from '@/lib/redis';
import { UserSession } from '@/utils/session';

test.describe('Address Validation', () => {
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
  });

  test.describe('Postcode and Suburb Mismatch', () => {
    test('should show error when postcode does not match suburb - Broadway example', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '2000' &&
          postData.variables?.state === 'NSW' &&
          postData.variables?.suburb === 'Broadway'
        ) {
          // Mock GraphQL response format for postcode/suburb mismatch
          const mockResponse = {
            data: {
              validateAddress: {
                success: false,
                message: 'The postcode 2000 does not match the suburb Broadway.'
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with mismatched data: postcode 2000 with Broadway
      // For Safari compatibility: focus, clear, then type
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('2000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Broadway');

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      // Wait for button to be enabled and click
      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the error message to appear
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toHaveText('The postcode 2000 does not match the suburb Broadway.');
    });

    test('should show error when postcode does not match suburb - Melbourne example', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '2000' &&
          postData.variables?.state === 'VIC' &&
          postData.variables?.suburb === 'Melbourne'
        ) {
          // Mock GraphQL response format for no results found
          const mockResponse = {
            data: {
              validateAddress: {
                success: false,
                message: 'No results found for postcode 2000 in state VIC.'
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with mismatched data: postcode 2000 with Melbourne (which should be 3000)
      // For Safari compatibility: focus, clear, then type
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('2000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Melbourne');

      // Select VIC state
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-VIC').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      // Wait for button to be enabled and click
      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 2000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the error message to appear
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toHaveText('No results found for postcode 2000 in state VIC.');
    });
  });

  test.describe('Suburb and State Mismatch', () => {
    test('should show error when suburb does not exist in selected state - Ferntree Gully in TAS', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '3156' &&
          postData.variables?.state === 'TAS' &&
          postData.variables?.suburb === 'Ferntree Gully'
        ) {
          // Mock GraphQL response format for suburb/state mismatch
          const mockResponse = {
            data: {
              validateAddress: {
                success: false,
                message:
                  'The suburb Ferntree Gully does not exist in the state (TAS).'
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with suburb/state mismatch: Ferntree Gully (VIC) with TAS state
      // For Safari compatibility: focus, clear, then fill
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('3156');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Ferntree Gully');

      // Select TAS state (Ferntree Gully is actually in VIC)
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-TAS').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the error message to appear
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toHaveText(
        'The suburb Ferntree Gully does not exist in the state (TAS).'
      );
    });

    test('should show error when suburb does not exist in selected state - Perth in NSW', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '6000' &&
          postData.variables?.state === 'NSW' &&
          postData.variables?.suburb === 'Perth'
        ) {
          // Mock GraphQL response format for suburb/state mismatch
          const mockResponse = {
            data: {
              validateAddress: {
                success: false,
                message: 'The suburb Perth does not exist in the state (NSW).'
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with suburb/state mismatch: Perth (WA) with NSW state
      // For Safari compatibility: focus, clear, then fill
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('6000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Perth');

      // Select NSW state (Perth is actually in WA)
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-NSW').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the error message to appear
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-error-message')
      ).toHaveText('The suburb Perth does not exist in the state (NSW).');
    });
  });

  test.describe('Valid Address Input', () => {
    test('should show success message when all inputs are valid - Melbourne VIC 3000', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '3000' &&
          postData.variables?.state === 'VIC' &&
          postData.variables?.suburb === 'Melbourne'
        ) {
          // Mock GraphQL response format for valid address (no coordinates)
          const mockResponse = {
            data: {
              validateAddress: {
                success: true,
                message: 'The postcode, suburb, and state input are valid.',
                latitude: null,
                longitude: null
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with valid address data: Melbourne VIC 3000
      // For Safari compatibility: focus, clear, then fill
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('3000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Melbourne');

      // Select VIC state
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-VIC').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the success message to appear
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toHaveText('The postcode, suburb, and state input are valid.');

      // Ensure no error message is displayed
      await expect(
        page.getByTestId('address-verification-error-message')
      ).not.toBeVisible();

      // Map with no coordinates message should be displayed since coordinates are null
      await expect(page.getByTestId('map-with-coordinates')).not.toBeVisible();
      await expect(page.getByTestId('map-no-coordinates')).toBeVisible();
    });

    test('should show success message when all inputs are valid - Brisbane QLD 4000', async ({
      page
    }) => {
      // Mock the GraphQL proxy API
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '4000' &&
          postData.variables?.state === 'QLD' &&
          postData.variables?.suburb === 'Brisbane'
        ) {
          // Mock GraphQL response format for valid address (no coordinates)
          const mockResponse = {
            data: {
              validateAddress: {
                success: true,
                message: 'The postcode, suburb, and state input are valid.',
                latitude: null,
                longitude: null
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with valid address data: Brisbane QLD 4000
      // For Safari compatibility: focus, clear, then fill
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('4000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Brisbane');

      // Select QLD state
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-QLD').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the success message to appear
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toHaveText('The postcode, suburb, and state input are valid.');

      // Ensure no error message is displayed
      await expect(
        page.getByTestId('address-verification-error-message')
      ).not.toBeVisible();

      // Map with no coordinates message should be displayed since coordinates are null
      await expect(page.getByTestId('map-with-coordinates')).not.toBeVisible();
      await expect(page.getByTestId('map-no-coordinates')).toBeVisible();
    });
  });

  test.describe('Map Component Display', () => {
    test('should display map when valid address with coordinates is returned - Sydney NSW 2000', async ({
      page
    }) => {
      // Mock the GraphQL proxy API with coordinates
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '2000' &&
          postData.variables?.state === 'NSW' &&
          postData.variables?.suburb === 'Sydney'
        ) {
          // Mock GraphQL response format for valid address with coordinates
          const mockResponse = {
            data: {
              validateAddress: {
                success: true,
                message: 'The postcode, suburb, and state input are valid.',
                latitude: -33.8688,
                longitude: 151.2093
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with valid address data: Sydney NSW 2000
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('2000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Sydney');

      // NSW is the default state, no need to change

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the success message to appear
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toHaveText('The postcode, suburb, and state input are valid.');

      // Map with coordinates should be displayed
      await expect(page.getByTestId('map-with-coordinates')).toBeVisible({
        timeout: 10000
      });

      // No coordinates message should not be displayed
      await expect(page.getByTestId('map-no-coordinates')).not.toBeVisible();

      // Ensure no error message is displayed
      await expect(
        page.getByTestId('address-verification-error-message')
      ).not.toBeVisible();
    });

    test('should display "no coordinates" message when valid address returns without coordinates - Perth WA 6000', async ({
      page
    }) => {
      // Mock the GraphQL proxy API without coordinates
      await page.route('**/api/graphql-proxy', async (route) => {
        const request = route.request();
        const postData = await request.postDataJSON();

        if (
          postData.variables?.postcode === '6000' &&
          postData.variables?.state === 'WA' &&
          postData.variables?.suburb === 'Perth'
        ) {
          // Mock GraphQL response format for valid address without coordinates
          const mockResponse = {
            data: {
              validateAddress: {
                success: true,
                message: 'The postcode, suburb, and state input are valid.',
                latitude: null,
                longitude: null
              }
            }
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Fill in the form with valid address data: Perth WA 6000
      await page.getByTestId('postcode-input').focus();
      await page.getByTestId('postcode-input').clear();
      await page.getByTestId('postcode-input').fill('6000');

      await page.getByTestId('suburb-input').focus();
      await page.getByTestId('suburb-input').clear();
      await page.getByTestId('suburb-input').fill('Perth');

      // Select WA state
      await page.getByTestId('state-dropdown-trigger').click();
      await page.getByTestId('state-dropdown-item-WA').click();

      // Wait for form validation to complete and button to be enabled
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('verify-button')).toBeEnabled({
        timeout: 5000
      });
      await page.getByTestId('verify-button').click();

      await page.waitForTimeout(2000);

      // Wait for the success message to appear
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('address-verification-success-message')
      ).toHaveText('The postcode, suburb, and state input are valid.');

      // No coordinates message should be displayed
      await expect(page.getByTestId('map-no-coordinates')).toBeVisible({
        timeout: 10000
      });
      await expect(page.getByTestId('map-no-coordinates')).toHaveText(
        'No coordinates found for this address 🫥'
      );

      // Map with coordinates should not be displayed
      await expect(page.getByTestId('map-with-coordinates')).not.toBeVisible();

      // Ensure no error message is displayed
      await expect(
        page.getByTestId('address-verification-error-message')
      ).not.toBeVisible();
    });
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
