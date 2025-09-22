import 'server-only';

import { ELASTICSEARCH_INDEXES } from '@/constants/elasticsearch';
import { esClient } from '@/lib/elastic';
import { NewUser, User } from '@/types/user';

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await esClient.search({
    index: ELASTICSEARCH_INDEXES.USERS,
    query: {
      term: { email }
    }
  });

  if (user.hits.hits.length === 0) {
    return null;
  }

  return user.hits.hits[0]._source as User;
}

export async function createUser(user: NewUser) {
  await esClient.index({
    index: ELASTICSEARCH_INDEXES.USERS,
    id: user.id,
    document: {
      ...user,
      createdAt: new Date().toISOString()
    },
    refresh: 'wait_for'
  });
}
