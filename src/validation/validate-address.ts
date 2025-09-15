import z from 'zod';

import { states } from '@/types/locality';

export const validateAddressSchema = z.object({
  postcode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, { message: 'Postcode must be exactly 4 digits' }),
  suburb: z
    .string()
    .trim()
    .min(1, { message: 'Suburb is required' })
    .max(100, { message: 'Suburb must be less than 100 characters' })
    .regex(/^[a-zA-Z0-9\s'\-\.]+$/, {
      message:
        'Suburb can only contain letters, numbers, spaces, apostrophes, hyphens, and periods'
    }),
  state: z.enum(states, { message: 'State is required' })
});

export type ValidateAddressSchema = z.infer<typeof validateAddressSchema>;

export function validateValidateAddress(data: unknown) {
  const result = validateAddressSchema.safeParse(data);

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
