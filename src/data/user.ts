import 'server-only';

import { esClient } from '@/lib/elastic';
import { NewUser, User } from '@/types/user';

const USER_INDEX = 'users';

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await esClient.search({
    index: USER_INDEX,
    query: {
      term: {
        'email.keyword': email
      }
    }
  });

  if (user.hits.hits.length === 0) {
    return null;
  }

  return user.hits.hits[0]._source as User;
}

export async function createUser(user: NewUser) {
  await esClient.index({
    index: USER_INDEX,
    id: user.id,
    document: {
      ...user,
      createdAt: new Date().toISOString()
    }
  });
}
