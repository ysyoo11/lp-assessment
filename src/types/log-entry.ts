import { ValidateAddressSchema } from '@/validation/validate-address';

import { User } from './user';

export type LogEntry = ValidateAddressSchema & {
  userId: User['id'];
  timestamp: string;
  success: boolean;
  errorMessage?: string;
};
