const ENV_KEYS = [
  'BCRYPT_SALT_ROUNDS',
  'REDIS_URL',
  'REDIS_TOKEN',
  'ELASTICSEARCH_URL',
  'ELASTICSEARCH_API_KEY'
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

export const ENV = {
  BCRYPT_SALT_ROUNDS: required('BCRYPT_SALT_ROUNDS'),
  REDIS_URL: required('REDIS_URL'),
  REDIS_TOKEN: required('REDIS_TOKEN'),
  ELASTICSEARCH_URL: required('ELASTICSEARCH_URL'),
  ELASTICSEARCH_API_KEY: required('ELASTICSEARCH_API_KEY')
};

function required(key: EnvKey, defaultValue?: string) {
  const value = process.env[key] ?? defaultValue;
  if (value == null) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
