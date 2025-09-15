import { ValidateAddressSchema } from '@/validation/validate-address';

export const VALIDATION_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  INVALID_INPUT: 'Invalid input',
  NO_RESULTS_FOR_POSTCODE: (
    postcode: ValidateAddressSchema['postcode'],
    state: ValidateAddressSchema['state']
  ) => `No results found for postcode ${postcode} in state ${state}.`,
  POSTCODE_SUBURB_MISMATCH: (
    postcode: ValidateAddressSchema['postcode'],
    suburb: ValidateAddressSchema['suburb']
  ) => `The postcode ${postcode} does not match the suburb ${suburb}.`,
  SUBURB_STATE_MISMATCH: (
    suburb: ValidateAddressSchema['suburb'],
    state: ValidateAddressSchema['state']
  ) => `The suburb ${suburb} does not exist in the state (${state}).`,
  SERVER_ERROR: 'Internal server error. Please try again later.'
} as const;

export const VALIDATION_SUCCESS_MESSAGE =
  'The postcode, suburb, and state input are valid.';
