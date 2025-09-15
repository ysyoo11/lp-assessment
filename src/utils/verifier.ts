import {
  VALIDATION_ERROR_MESSAGES,
  VALIDATION_SUCCESS_MESSAGE
} from '@/constants/validate-address';
import { Locality } from '@/types/locality';
import {
  ValidateAddressSchema,
  validateValidateAddress
} from '@/validation/validate-address';

export type ValidationResult = {
  success: boolean;
  message: string;
  latitude?: Locality['latitude'];
  longitude?: Locality['longitude'];
  status: number;
};

/**
 * Validates the address data
 * @param localities - The localities to search through
 * @param userInput - The user input to validate
 * @returns The validation result
 */
export function validateAddressData(
  localities: Locality[],
  userInput: ValidateAddressSchema
): ValidationResult {
  const { postcode, suburb, state } = userInput;

  if (localities.length === 0) {
    return {
      success: false,
      message: VALIDATION_ERROR_MESSAGES.NO_RESULTS_FOR_POSTCODE(
        postcode,
        state
      ),
      status: 400
    };
  }

  const matchedSuburb = findMatchedSuburb(localities, suburb);

  if (!matchedSuburb) {
    return {
      success: false,
      message: VALIDATION_ERROR_MESSAGES.POSTCODE_SUBURB_MISMATCH(
        postcode,
        suburb
      ),
      status: 400
    };
  }

  if (!isSuburbInState(matchedSuburb, state)) {
    return {
      success: false,
      message: VALIDATION_ERROR_MESSAGES.SUBURB_STATE_MISMATCH(suburb, state),
      status: 400
    };
  }

  // All checks passed
  return {
    success: true,
    message: VALIDATION_SUCCESS_MESSAGE,
    latitude: matchedSuburb.latitude,
    longitude: matchedSuburb.longitude,
    status: 200
  };
}

/**
 * Validates the input data from the verifier form
 * @param variables - The input data from the verifier form
 * @returns The validated data
 */
export function validateVerifierFormInputData(
  variables: unknown
): ValidateAddressSchema {
  const validation = validateValidateAddress(variables);
  if (!validation.success) {
    const message =
      validation.error.fieldErrors['postcode']?.[0] ||
      validation.error.fieldErrors['suburb']?.[0] ||
      validation.error.fieldErrors['state']?.[0] ||
      'Invalid input';
    throw new Error(message);
  }
  return validation.data;
}

/**
 * Finds the matched suburb in the localities
 * @param localities - The localities to search through
 * @param suburb - The suburb to search for
 * @returns The matched suburb
 */
function findMatchedSuburb(
  localities: Locality[],
  suburb: ValidateAddressSchema['suburb']
): Locality | undefined {
  return localities.find((locality) => {
    const localityName =
      'location' in locality ? locality.location : locality.suburb;
    return localityName.trim().toLowerCase() === suburb.trim().toLowerCase();
  });
}

function isSuburbInState(
  suburb: Locality,
  state: ValidateAddressSchema['state']
): boolean {
  return suburb.state.trim().toLowerCase() === state.trim().toLowerCase();
}
