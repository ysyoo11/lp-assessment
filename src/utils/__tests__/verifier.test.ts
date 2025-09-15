import { describe, expect, it } from 'vitest';

import {
  VALIDATION_ERROR_MESSAGES,
  VALIDATION_SUCCESS_MESSAGE
} from '@/constants/validate-address';
import { Locality } from '@/types/locality';
import { ValidateAddressSchema } from '@/validation/validate-address';

import { ValidationResult, validateAddressData } from '../verifier';

describe('validateAddressData', () => {
  const mockUserInput: ValidateAddressSchema = {
    postcode: '2000',
    suburb: 'Sydney',
    state: 'NSW'
  };

  const createMockLocality = (
    name: string,
    state: ValidateAddressSchema['state'] = 'NSW',
    useLocation: boolean = false
  ): Locality => {
    const baseLocality = {
      category: 'Delivery Area',
      id: 1,
      latitude: -33.8688,
      longitude: 151.2093,
      postcode: '2000',
      state
    };

    return useLocation
      ? { ...baseLocality, location: name }
      : { ...baseLocality, suburb: name };
  };

  describe('when localities array is empty', () => {
    it('should return failure with NO_RESULTS_FOR_POSTCODE message', () => {
      const result = validateAddressData([], mockUserInput);

      expect(result).toEqual<ValidationResult>({
        success: false,
        message: VALIDATION_ERROR_MESSAGES.NO_RESULTS_FOR_POSTCODE(
          '2000',
          'NSW'
        ),
        status: 400
      });
    });
  });

  describe('when suburb is not found in localities', () => {
    it('should return failure with POSTCODE_SUBURB_MISMATCH message', () => {
      const localities = [
        createMockLocality('Pyrmont'),
        createMockLocality('The Rocks')
      ];

      const result = validateAddressData(localities, mockUserInput);

      expect(result).toEqual<ValidationResult>({
        success: false,
        message: VALIDATION_ERROR_MESSAGES.POSTCODE_SUBURB_MISMATCH(
          '2000',
          'Sydney'
        ),
        status: 400
      });
    });

    it('should handle case-insensitive suburb matching', () => {
      const localities = [createMockLocality('SYDNEY')];
      const userInput = { ...mockUserInput, suburb: 'sydney' };

      const result = validateAddressData(localities, userInput);

      expect(result.success).toBe(true);
    });
  });

  describe('when suburb exists but state does not match', () => {
    it('should return failure with SUBURB_STATE_MISMATCH message', () => {
      const localities = [createMockLocality('Sydney', 'VIC')];

      const result = validateAddressData(localities, mockUserInput);

      expect(result).toEqual<ValidationResult>({
        success: false,
        message: VALIDATION_ERROR_MESSAGES.SUBURB_STATE_MISMATCH(
          'Sydney',
          'NSW'
        ),
        status: 400
      });
    });

    it('should handle case-insensitive state matching', () => {
      const locality: Locality = {
        category: 'Delivery Area',
        id: 1,
        latitude: -33.8688,
        longitude: 151.2093,
        postcode: '2000',
        state: 'nsw' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        suburb: 'Sydney'
      };
      const userInput: ValidateAddressSchema = {
        ...mockUserInput,
        state: 'NSW'
      };

      const result = validateAddressData([locality], userInput);

      expect(result.success).toBe(true);
    });
  });

  describe('when all validations pass', () => {
    it('should return success with valid message', () => {
      const localities = [createMockLocality('Sydney', 'NSW')];

      const result = validateAddressData(localities, mockUserInput);

      expect(result).toEqual<ValidationResult>({
        success: true,
        message: VALIDATION_SUCCESS_MESSAGE,
        latitude: -33.8688,
        longitude: 151.2093,
        status: 200
      });
    });

    it('should find correct suburb when multiple localities exist', () => {
      const localities = [
        createMockLocality('Pyrmont', 'NSW'),
        createMockLocality('Sydney', 'NSW'),
        createMockLocality('The Rocks', 'NSW')
      ];

      const result = validateAddressData(localities, mockUserInput);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle suburb with mixed case in localities', () => {
      const localities = [createMockLocality('SyDnEy', 'NSW')];
      const userInput = { ...mockUserInput, suburb: 'sydney' };

      const result = validateAddressData(localities, userInput);

      expect(result.success).toBe(true);
    });

    it('should prioritize first matching suburb when duplicates exist', () => {
      const localities = [
        createMockLocality('Sydney', 'NSW'),
        createMockLocality('Sydney', 'VIC')
      ];

      const result = validateAddressData(localities, mockUserInput);

      expect(result.success).toBe(true);
    });

    it('should handle different postcode values', () => {
      const userInput: ValidateAddressSchema = {
        postcode: '3000',
        suburb: 'Melbourne',
        state: 'VIC'
      };
      const localities = [createMockLocality('Melbourne', 'VIC')];

      const result = validateAddressData(localities, userInput);

      expect(result.success).toBe(true);
    });

    it('should handle all Australian states', () => {
      const states: ValidateAddressSchema['state'][] = [
        'NSW',
        'VIC',
        'QLD',
        'SA',
        'WA',
        'TAS',
        'NT',
        'ACT'
      ];

      states.forEach((state) => {
        const userInput: ValidateAddressSchema = {
          postcode: '1000',
          suburb: 'TestSuburb',
          state
        };
        const localities = [createMockLocality('TestSuburb', state)];

        const result = validateAddressData(localities, userInput);

        expect(result.success).toBe(true);
      });
    });

    it('should handle suburb with leading and trailing whitespace', () => {
      const localities = [createMockLocality('Sydney', 'NSW')];

      const userInputLeading = {
        ...mockUserInput,
        suburb: ' Sydney'
      } as ValidateAddressSchema;

      const userInputTrailing = {
        ...mockUserInput,
        suburb: 'Sydney '
      } as ValidateAddressSchema;

      const userInputBoth = {
        ...mockUserInput,
        suburb: ' Sydney '
      } as ValidateAddressSchema;

      const resultLeading = validateAddressData(localities, userInputLeading);
      const resultTrailing = validateAddressData(localities, userInputTrailing);
      const resultBoth = validateAddressData(localities, userInputBoth);

      expect(resultLeading.success).toBe(true);
      expect(resultLeading.message).toBe(VALIDATION_SUCCESS_MESSAGE);

      expect(resultTrailing.success).toBe(true);
      expect(resultTrailing.message).toBe(VALIDATION_SUCCESS_MESSAGE);

      expect(resultBoth.success).toBe(true);
      expect(resultBoth.message).toBe(VALIDATION_SUCCESS_MESSAGE);
    });

    it('should handle suburb with multiple spaces and special whitespace characters', () => {
      const localities = [createMockLocality('Sydney', 'NSW')];

      const userInputTab = {
        ...mockUserInput,
        suburb: 'Sydney\t'
      } as ValidateAddressSchema;

      const userInputNewline = {
        ...mockUserInput,
        suburb: 'Sydney\n'
      } as ValidateAddressSchema;

      const userInputMultipleSpaces = {
        ...mockUserInput,
        suburb: '  Sydney  '
      } as ValidateAddressSchema;

      const resultTab = validateAddressData(localities, userInputTab);
      const resultNewline = validateAddressData(localities, userInputNewline);
      const resultMultipleSpaces = validateAddressData(
        localities,
        userInputMultipleSpaces
      );

      expect(resultTab.success).toBe(true);
      expect(resultTab.message).toBe(VALIDATION_SUCCESS_MESSAGE);

      expect(resultNewline.success).toBe(true);
      expect(resultNewline.message).toBe(VALIDATION_SUCCESS_MESSAGE);

      expect(resultMultipleSpaces.success).toBe(true);
      expect(resultMultipleSpaces.message).toBe(VALIDATION_SUCCESS_MESSAGE);
    });
  });

  describe('locality structure variations', () => {
    it('should work with locality containing "location" field', () => {
      const locality: Locality = {
        category: 'Delivery Area',
        id: 1,
        latitude: -33.8688,
        longitude: 151.2093,
        postcode: '2000',
        state: 'NSW',
        location: 'Sydney'
      };

      const result = validateAddressData([locality], mockUserInput);

      expect(result.success).toBe(true);
    });
  });
});
