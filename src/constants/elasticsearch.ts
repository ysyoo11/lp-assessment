const FIRST_NAME = 'owen';
const LAST_NAME = 'yoo';
const INDEX_PREFIX = `${FIRST_NAME}-${LAST_NAME}`;

export const ELASTICSEARCH_INDEXES = {
  USERS: `${INDEX_PREFIX}-users`,
  LOGS: `${INDEX_PREFIX}-logs`
};
