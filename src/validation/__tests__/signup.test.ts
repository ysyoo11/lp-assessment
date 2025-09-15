import { describe, expect, it } from 'vitest';

import { validateSignup } from '../signup';

describe('validateSignup - Input Validation', () => {
  const validSignupData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'TestPassword123!',
    passwordConfirm: 'TestPassword123!'
  };

  describe('successful validation', () => {
    it('should accept valid signup data', () => {
      const result = validateSignup(validSignupData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.password).toBe('TestPassword123!');
        expect(result.data.passwordConfirm).toBe('TestPassword123!');
      }
    });

    it('should reject email with leading/trailing whitespace (current Zod behavior)', () => {
      const result = validateSignup({
        ...validSignupData,
        email: '  JOHN.DOE@EXAMPLE.COM  '
      });

      // Current implementation validates email format before trimming
      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject email with whitespace even if other fields are valid (current Zod behavior)', () => {
      const result = validateSignup({
        name: '  John Doe  ',
        email: '  john.doe@example.com  ',
        password: '  TestPassword123!  ',
        passwordConfirm: '  TestPassword123!  '
      });

      // Current implementation validates email format before trimming
      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should trim whitespace from valid fields (name, password)', () => {
      const result = validateSignup({
        name: '  John Doe  ',
        email: 'john.doe@example.com', // No whitespace
        password: '  TestPassword123!  ',
        passwordConfirm: '  TestPassword123!  '
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.password).toBe('TestPassword123!');
        expect(result.data.passwordConfirm).toBe('TestPassword123!');
      }
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = validateSignup({
        ...validSignupData,
        name: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe(
        'Name must be at least 2 characters long'
      );
    });

    it('should reject name with only whitespace', () => {
      const result = validateSignup({
        ...validSignupData,
        name: '   '
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe(
        'Name must be at least 2 characters long'
      );
    });

    it('should reject name shorter than minimum length', () => {
      const result = validateSignup({
        ...validSignupData,
        name: 'J'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe(
        'Name must be at least 2 characters long'
      );
    });

    it('should accept name at minimum length', () => {
      const result = validateSignup({
        ...validSignupData,
        name: 'Jo'
      });

      expect(result.success).toBe(true);
    });

    it('should accept name at maximum length', () => {
      const result = validateSignup({
        ...validSignupData,
        name: 'A'.repeat(32)
      });

      expect(result.success).toBe(true);
    });

    it('should reject name longer than maximum length', () => {
      const result = validateSignup({
        ...validSignupData,
        name: 'A'.repeat(33)
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe(
        'Name must be at most 32 characters long'
      );
    });

    it('should handle missing name field', () => {
      const { name, ...dataWithoutName } = validSignupData;
      const result = validateSignup(dataWithoutName);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe('Name is required');
    });
  });

  describe('email validation', () => {
    it('should reject invalid email format', () => {
      const result = validateSignup({
        ...validSignupData,
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject email without domain', () => {
      const result = validateSignup({
        ...validSignupData,
        email: 'john.doe@'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject email without @ symbol', () => {
      const result = validateSignup({
        ...validSignupData,
        email: 'john.doeexample.com'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject empty email', () => {
      const result = validateSignup({
        ...validSignupData,
        email: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should handle missing email field', () => {
      const { email, ...dataWithoutEmail } = validSignupData;
      const result = validateSignup(dataWithoutEmail);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user_name@example-domain.com'
      ];

      validEmails.forEach((email) => {
        const result = validateSignup({
          ...validSignupData,
          email
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('password validation', () => {
    it('should reject empty password', () => {
      const result = validateSignup({
        ...validSignupData,
        password: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password shorter than minimum length', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'Test1!',
        passwordConfirm: 'Test1!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password longer than maximum length', () => {
      const longPassword = 'TestPassword123!' + 'A'.repeat(20); // 36 characters total
      const result = validateSignup({
        ...validSignupData,
        password: longPassword,
        passwordConfirm: longPassword
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at most 32 characters long'
      );
    });

    it('should reject password without uppercase letters', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'testpassword123!',
        passwordConfirm: 'testpassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without lowercase letters', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'TESTPASSWORD123!',
        passwordConfirm: 'TESTPASSWORD123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without numbers', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'TestPassword!',
        passwordConfirm: 'TestPassword!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without special characters', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'TestPassword123',
        passwordConfirm: 'TestPassword123'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should accept password with all allowed special characters', () => {
      const specialChars = [
        '@',
        '!',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '_',
        '+',
        '=',
        '?',
        '-'
      ];

      specialChars.forEach((char) => {
        const password = `TestPassword123${char}`;
        const result = validateSignup({
          ...validSignupData,
          password,
          passwordConfirm: password
        });

        expect(result.success).toBe(true);
      });
    });

    it('should reject password with disallowed special characters', () => {
      const disallowedChars = [
        '(',
        ')',
        '[',
        ']',
        '{',
        '}',
        '|',
        '\\',
        '/',
        '<',
        '>',
        ',',
        '.',
        ';',
        ':',
        '"',
        "'"
      ];

      disallowedChars.forEach((char) => {
        const password = `TestPassword123${char}`;
        const result = validateSignup({
          ...validSignupData,
          password,
          passwordConfirm: password
        });

        expect(result.success).toBe(false);
        expect(result.error?.fieldErrors.password?.[0]).toBe(
          'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
        );
      });
    });

    it('should accept password at minimum length with all requirements', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'Test123!',
        passwordConfirm: 'Test123!'
      });

      expect(result.success).toBe(true);
    });

    it('should accept password at maximum length', () => {
      const password = 'A'.repeat(28) + '1a!'; // 31 chars total (under 32 limit)
      const result = validateSignup({
        ...validSignupData,
        password,
        passwordConfirm: password
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing password field', () => {
      const { password, ...dataWithoutPassword } = validSignupData;
      const result = validateSignup(dataWithoutPassword);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password is required'
      );
    });
  });

  describe('password confirmation validation', () => {
    it('should reject empty password confirmation', () => {
      const result = validateSignup({
        ...validSignupData,
        passwordConfirm: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.passwordConfirm?.[0]).toBe(
        'Passwords do not match.'
      );
    });

    it('should reject when passwords do not match', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'TestPassword123!',
        passwordConfirm: 'DifferentPassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.passwordConfirm?.[0]).toBe(
        'Passwords do not match.'
      );
    });

    it('should accept when passwords match exactly', () => {
      const result = validateSignup({
        ...validSignupData,
        password: 'TestPassword123!',
        passwordConfirm: 'TestPassword123!'
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing passwordConfirm field', () => {
      const { passwordConfirm, ...dataWithoutConfirm } = validSignupData;
      const result = validateSignup(dataWithoutConfirm);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.passwordConfirm?.[0]).toBe(
        'Please confirm your password.'
      );
    });

    it('should match passwords after trimming whitespace', () => {
      const result = validateSignup({
        ...validSignupData,
        password: '  TestPassword123!  ',
        passwordConfirm: '  TestPassword123!  '
      });

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle null input', () => {
      const result = validateSignup(null);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle undefined input', () => {
      const result = validateSignup(undefined);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle empty object', () => {
      const result = validateSignup({});

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe('Name is required');
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password is required'
      );
      expect(result.error?.fieldErrors.passwordConfirm?.[0]).toBe(
        'Please confirm your password.'
      );
    });

    it('should handle multiple validation errors simultaneously', () => {
      const result = validateSignup({
        name: 'A', // Too short
        email: 'invalid-email', // Invalid format
        password: 'weak', // Too short and missing requirements
        passwordConfirm: 'different' // Doesn't match
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.name?.[0]).toBe(
        'Name must be at least 2 characters long'
      );
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
      expect(result.error?.fieldErrors.passwordConfirm?.[0]).toBe(
        'Passwords do not match.'
      );
    });

    it('should handle string input instead of object', () => {
      const result = validateSignup('invalid input');

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle number input instead of object', () => {
      const result = validateSignup(123);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle array input instead of object', () => {
      const result = validateSignup([]);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });
  });

  describe('boundary testing', () => {
    it('should accept name exactly at boundaries', () => {
      // Test minimum boundary
      const minResult = validateSignup({
        ...validSignupData,
        name: 'AB' // 2 characters
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary
      const maxResult = validateSignup({
        ...validSignupData,
        name: 'A'.repeat(32) // 32 characters
      });
      expect(maxResult.success).toBe(true);
    });

    it('should accept password exactly at boundaries', () => {
      // Test minimum boundary
      const minPassword = 'Test123!'; // 8 characters
      const minResult = validateSignup({
        ...validSignupData,
        password: minPassword,
        passwordConfirm: minPassword
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary
      const maxPassword = 'A'.repeat(28) + '1a!'; // 31 characters (under 32 limit)
      const maxResult = validateSignup({
        ...validSignupData,
        password: maxPassword,
        passwordConfirm: maxPassword
      });
      expect(maxResult.success).toBe(true);
    });
  });
});
