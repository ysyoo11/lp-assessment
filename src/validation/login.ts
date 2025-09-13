import z from 'zod';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX
} from '@/constants/auth';

export const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }).trim().toLowerCase(),
  password: z
    .string({ error: 'Password is required' })
    .min(PASSWORD_MIN_LENGTH, {
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    })
    .regex(PASSWORD_REGEX, {
      error:
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`
    })
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type LoginSchemaError = z.core.$ZodFlattenedError<LoginSchema>;

export function validateLogin(data: unknown) {
  const result = loginSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false as const,
      error: z.flattenError(result.error)
    };
  }

  return {
    success: true as const,
    data: result.data
  };
}
