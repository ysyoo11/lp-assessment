import z from 'zod';

import { states } from '@/types/locality';

export const validateAddressSchema = z.object({
  postcode: z.string().length(4, { error: 'Postcode must be 4 digits' }),
  suburb: z
    .string()
    .trim()
    .min(1, { error: 'Suburb is required' })
    .max(100, { error: 'Suburb must be less than 100 characters' }),
  state: z.enum(states, { error: 'State is required' })
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
