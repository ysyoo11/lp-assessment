import 'server-only';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { esClient } from '@/lib/elastic';
import { LogEntry } from '@/types/log-entry';

export async function logVerificationAttempt(logEntry: LogEntry) {
  try {
    await esClient.index({
      index: ELASTICSEARCH_INDEXES.LOGS,
      document: logEntry
    });
  } catch (error) {
    console.error('Failed to log verification attempt:', error);
  }
}
