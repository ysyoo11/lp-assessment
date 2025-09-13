import z from 'zod';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX
} from '@/constants/auth';
import { USER_NAME_MAX_LENGTH, USER_NAME_MIN_LENGTH } from '@/constants/user';

export const signupSchema = z
  .object({
    name: z
      .string({ error: 'Name is required' })
      .trim()
      .min(USER_NAME_MIN_LENGTH, {
        error: `Name must be at least ${USER_NAME_MIN_LENGTH} characters long`
      })
      .max(USER_NAME_MAX_LENGTH, {
        error: `Name must be at most ${USER_NAME_MAX_LENGTH} characters long`
      }),
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
      }),
    passwordConfirm: z.string({ error: 'Please confirm your password.' })
  })
  .refine((data) => data.password === data.passwordConfirm, {
    error: 'Passwords do not match.',
    path: ['passwordConfirm']
  });

export type SignupSchema = z.infer<typeof signupSchema>;
export type SignupSchemaError = z.core.$ZodFlattenedError<SignupSchema>;

export function validateSignup(data: unknown) {
  const result = signupSchema.safeParse(data);

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
