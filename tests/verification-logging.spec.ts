import { expect, test } from '@playwright/test';
import crypto from 'crypto';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { esClient } from '@/lib/elastic';
import { redisClient } from '@/lib/redis';
import { LogEntry } from '@/types/log-entry';
import { UserSession } from '@/utils/session';

test.describe('Verification Logging to Elasticsearch', () => {
  let sessionId: string;
  let mockUser: UserSession;

  test.beforeEach(async ({ page }, testInfo) => {
    // Skip this test if external services are not available
    test.skip(
      process.env.CI === 'true' ||
        !process.env.REDIS_URL ||
        !process.env.ELASTICSEARCH_URL,
      'Skipping integration test - requires Redis and Elasticsearch'
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

  test('should log successful verification attempt to Elasticsearch', async ({
    page
  }) => {
    await page.getByTestId('postcode-input').focus();
    await page.getByTestId('postcode-input').clear();
    await page.getByTestId('postcode-input').fill('2000');
    await page.getByTestId('suburb-input').focus();
    await page.getByTestId('suburb-input').clear();
    await page.getByTestId('suburb-input').fill('Sydney');
    await page.getByTestId('state-dropdown-trigger').click();
    await page.getByTestId('state-dropdown-item-NSW').click();

    await page.getByTestId('verify-button').click();

    await page.waitForTimeout(5000);

    // Retry pattern to handle Elasticsearch indexing delays
    // ES has a default refresh interval of 1s, but network/server delays can cause longer waits
    let searchResponse;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      await page.waitForTimeout(500);
      searchResponse = await esClient.search({
        index: ELASTICSEARCH_INDEXES.LOGS,
        query: { term: { 'userId.keyword': mockUser.id } },
        sort: [{ timestamp: { order: 'desc' } }],
        size: 1
      });
      attempts++;
    } while (searchResponse.hits.hits.length === 0 && attempts < maxAttempts);

    expect(searchResponse.hits.hits.length).toBe(1);

    const logEntry = searchResponse.hits.hits[0]._source as LogEntry;
    expect(logEntry).toMatchObject({
      userId: mockUser.id,
      postcode: '2000',
      suburb: 'Sydney',
      state: 'NSW',
      success: true
    });
    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.errorMessage).toBeUndefined();
  });

  test('should log failed verification attempt to Elasticsearch', async ({
    page
  }) => {
    await page.getByTestId('postcode-input').focus();
    await page.getByTestId('postcode-input').clear();
    await page.getByTestId('postcode-input').fill('9999');
    await page.getByTestId('suburb-input').focus();
    await page.getByTestId('suburb-input').clear();
    await page.getByTestId('suburb-input').fill('InvalidSuburb');
    await page.getByTestId('state-dropdown-trigger').click();
    await page.getByTestId('state-dropdown-item-NSW').click();

    await page.getByTestId('verify-button').click();

    await page.waitForTimeout(5000);

    // Retry pattern to handle Elasticsearch indexing delays
    // ES has a default refresh interval of 1s, but network/server delays can cause longer waits
    let searchResponse;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      await page.waitForTimeout(500);
      searchResponse = await esClient.search({
        index: ELASTICSEARCH_INDEXES.LOGS,
        query: { term: { 'userId.keyword': mockUser.id } },
        sort: [{ timestamp: { order: 'desc' } }],
        size: 1
      });
      attempts++;
    } while (searchResponse.hits.hits.length === 0 && attempts < maxAttempts);

    expect(searchResponse.hits.hits.length).toBe(1);

    const logEntry = searchResponse.hits.hits[0]._source as LogEntry;
    expect(logEntry).toMatchObject({
      userId: mockUser.id,
      postcode: '9999',
      suburb: 'InvalidSuburb',
      state: 'NSW',
      success: false
    });
    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.errorMessage).toBeDefined();
    expect(typeof logEntry.errorMessage).toBe('string');
  });

  test('should log validation error attempt to Elasticsearch (direct API call)', async ({
    page
  }) => {
    // Direct API call to bypass form validation
    await page.request.post('/api/graphql-proxy', {
      data: {
        query: `query ValidateAddress($postcode: String!, $suburb: String!, $state: String!) {
          validateAddress(postcode: $postcode, suburb: $suburb, state: $state) {
            success
            message
          }
        }`,
        variables: {
          postcode: '200000',
          suburb: 'InvalidSuburb',
          state: 'NSW'
        }
      }
    });

    await page.waitForTimeout(5000);

    const searchResponse = await esClient.search({
      index: ELASTICSEARCH_INDEXES.LOGS,
      query: {
        term: {
          'userId.keyword': mockUser.id
        }
      },
      sort: [{ timestamp: { order: 'desc' } }],
      size: 1
    });

    expect(searchResponse.hits.hits.length).toBe(1);

    const logEntry = searchResponse.hits.hits[0]._source as LogEntry;
    expect(logEntry).toMatchObject({
      userId: mockUser.id,
      success: false
    });
    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.errorMessage).toBeDefined();
    expect(logEntry.errorMessage).toContain(
      'Postcode must be exactly 4 digits'
    );
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

    // Clean up Elasticsearch logs for this test user
    if (mockUser?.id) {
      try {
        await esClient.deleteByQuery({
          index: ELASTICSEARCH_INDEXES.LOGS,
          query: {
            term: { 'userId.keyword': mockUser.id }
          }
        });
      } catch (error) {
        console.warn('Failed to clean up Elasticsearch logs:', error);
      }
    }
  });
});
