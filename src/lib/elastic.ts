import { Client } from '@elastic/elasticsearch';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { ENV } from '@/utils/env';

export const esClient = new Client({
  node: ENV.ELASTICSEARCH_URL,
  auth: {
    apiKey: ENV.ELASTICSEARCH_API_KEY
  },
  serverMode: 'serverless'
});

export async function ensureUserIndexExists() {
  const exists = await esClient.indices.exists({
    index: ELASTICSEARCH_INDEXES.USERS
  });

  if (!exists) {
    await esClient.indices.create({
      index: ELASTICSEARCH_INDEXES.USERS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          email: { type: 'keyword' },
          password: { type: 'keyword' },
          createdAt: { type: 'date' }
        }
      }
    });
  }
}

export async function ensureLogIndexExists() {
  const exists = await esClient.indices.exists({
    index: ELASTICSEARCH_INDEXES.LOGS
  });

  if (!exists) {
    await esClient.indices.create({
      index: ELASTICSEARCH_INDEXES.LOGS,
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          postcode: { type: 'keyword' },
          suburb: { type: 'keyword' },
          state: { type: 'keyword' },
          timestamp: { type: 'date' },
          success: { type: 'boolean' },
          errorMessage: { type: 'text' }
        }
      }
    });
  }
}
