import { Client } from '@elastic/elasticsearch';

import { ENV } from '@/utils/env';

export const esClient = new Client({
  node: ENV.ELASTICSEARCH_URL,
  auth: {
    apiKey: ENV.ELASTICSEARCH_API_KEY
  },
  serverMode: 'serverless'
});
