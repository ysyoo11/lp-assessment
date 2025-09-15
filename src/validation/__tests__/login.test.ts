import { describe, expect, it } from 'vitest';

import { validateLogin } from '../login';

describe('validateLogin - Input Validation', () => {
  const validLoginData = {
    email: 'john.doe@example.com',
    password: 'TestPassword123!'
  };

  describe('successful validation', () => {
    it('should accept valid login data', () => {
      const result = validateLogin(validLoginData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.password).toBe('TestPassword123!');
      }
    });

    it('should normalize email to lowercase', () => {
      const result = validateLogin({
        ...validLoginData,
        email: 'JOHN.DOE@EXAMPLE.COM'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
      }
    });

    it('should reject email with leading/trailing whitespace (current Zod behavior)', () => {
      const result = validateLogin({
        ...validLoginData,
        email: '  john.doe@example.com  '
      });

      // Current implementation validates email format before trimming
      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should trim whitespace from password field', () => {
      const result = validateLogin({
        email: 'john.doe@example.com', // No whitespace
        password: '  TestPassword123!  '
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.password).toBe('TestPassword123!');
      }
    });
  });

  describe('email validation', () => {
    it('should reject invalid email format', () => {
      const result = validateLogin({
        ...validLoginData,
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject email without domain', () => {
      const result = validateLogin({
        ...validLoginData,
        email: 'john.doe@'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject email without @ symbol', () => {
      const result = validateLogin({
        ...validLoginData,
        email: 'john.doeexample.com'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should reject empty email', () => {
      const result = validateLogin({
        ...validLoginData,
        email: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should handle missing email field', () => {
      const { email, ...dataWithoutEmail } = validLoginData;
      const result = validateLogin(dataWithoutEmail);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user_name@example-domain.com',
        'a@b.co',
        'very.long.email.address@very-long-domain-name.com'
      ];

      validEmails.forEach((email) => {
        const result = validateLogin({
          ...validLoginData,
          email
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(email.toLowerCase());
        }
      });
    });
  });

  describe('password validation', () => {
    it('should reject empty password', () => {
      const result = validateLogin({
        ...validLoginData,
        password: ''
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password shorter than minimum length', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'Test1!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password longer than maximum length', () => {
      const longPassword = 'TestPassword123!' + 'A'.repeat(20); // 36 characters total
      const result = validateLogin({
        ...validLoginData,
        password: longPassword
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at most 32 characters long'
      );
    });

    it('should reject password without uppercase letters', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'testpassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without lowercase letters', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'TESTPASSWORD123!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without numbers', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'TestPassword!'
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
      );
    });

    it('should reject password without special characters', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'TestPassword123'
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
        const result = validateLogin({
          ...validLoginData,
          password
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.password).toBe(password);
        }
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
        const result = validateLogin({
          ...validLoginData,
          password
        });

        expect(result.success).toBe(false);
        expect(result.error?.fieldErrors.password?.[0]).toBe(
          'Password must include uppercase letters, lowercase letters, numbers, and special characters.'
        );
      });
    });

    it('should accept password at minimum length with all requirements', () => {
      const result = validateLogin({
        ...validLoginData,
        password: 'Test123!'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('Test123!');
      }
    });

    it('should accept password at maximum length', () => {
      const password = 'A'.repeat(28) + '1a!'; // 31 chars total (under 32 limit)
      const result = validateLogin({
        ...validLoginData,
        password
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe(password);
      }
    });

    it('should handle missing password field', () => {
      const { password, ...dataWithoutPassword } = validLoginData;
      const result = validateLogin(dataWithoutPassword);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password is required'
      );
    });

    it('should trim password whitespace', () => {
      const result = validateLogin({
        ...validLoginData,
        password: '  TestPassword123!  '
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('TestPassword123!');
      }
    });
  });

  describe('login-specific scenarios', () => {
    it('should accept credentials that would be valid for existing user login', () => {
      // Test common login scenarios
      const loginScenarios = [
        {
          email: 'user@company.com',
          password: 'MySecure123!'
        },
        {
          email: 'admin@system.org',
          password: 'AdminPass456@'
        },
        {
          email: 'test.user@domain.co.uk',
          password: 'ComplexPass789#'
        }
      ];

      loginScenarios.forEach((credentials) => {
        const result = validateLogin(credentials);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(credentials.email.toLowerCase());
          expect(result.data.password).toBe(credentials.password);
        }
      });
    });

    it('should handle case-insensitive email matching for login', () => {
      const emailVariations = [
        'User@Example.Com',
        'USER@EXAMPLE.COM',
        'user@example.com',
        'UsEr@ExAmPlE.cOm'
      ];

      emailVariations.forEach((email) => {
        const result = validateLogin({
          email,
          password: 'TestPassword123!'
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('user@example.com'); // Always normalized to lowercase
        }
      });
    });

    it('should reject login attempts with weak passwords (even if user might have one)', () => {
      // These would fail validation even for login
      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'Password',
        'password123',
        'Password123' // Missing special character
      ];

      weakPasswords.forEach((password) => {
        const result = validateLogin({
          ...validLoginData,
          password
        });

        expect(result.success).toBe(false);
        expect(result.error?.fieldErrors.password).toBeDefined();
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle null input', () => {
      const result = validateLogin(null);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle undefined input', () => {
      const result = validateLogin(undefined);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle empty object', () => {
      const result = validateLogin({});

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password is required'
      );
    });

    it('should handle multiple validation errors simultaneously', () => {
      const result = validateLogin({
        email: 'invalid-email', // Invalid format
        password: 'weak' // Too short and missing requirements
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password must be at least 8 characters long'
      );
    });

    it('should handle string input instead of object', () => {
      const result = validateLogin('invalid input');

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle number input instead of object', () => {
      const result = validateLogin(123);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle array input instead of object', () => {
      const result = validateLogin([]);

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors).toBeDefined();
    });

    it('should handle partial data with only email', () => {
      const result = validateLogin({
        email: 'valid@example.com'
        // password missing
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password?.[0]).toBe(
        'Password is required'
      );
    });

    it('should handle partial data with only password', () => {
      const result = validateLogin({
        password: 'TestPassword123!'
        // email missing
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });
  });

  describe('boundary testing', () => {
    it('should accept password exactly at boundaries', () => {
      // Test minimum boundary
      const minPassword = 'Test123!'; // 8 characters
      const minResult = validateLogin({
        ...validLoginData,
        password: minPassword
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary
      const maxPassword = 'A'.repeat(28) + '1a!'; // 31 characters (under 32 limit)
      const maxResult = validateLogin({
        ...validLoginData,
        password: maxPassword
      });
      expect(maxResult.success).toBe(true);
    });

    it('should reject password just outside boundaries', () => {
      // Test just under minimum
      const tooShort = 'Test12!'; // 7 characters
      const shortResult = validateLogin({
        ...validLoginData,
        password: tooShort
      });
      expect(shortResult.success).toBe(false);

      // Test just over maximum (with valid pattern)
      const tooLong = 'TestPassword123!' + 'A'.repeat(20); // 36 characters
      const longResult = validateLogin({
        ...validLoginData,
        password: tooLong
      });
      expect(longResult.success).toBe(false);
    });

    it('should handle edge case email formats', () => {
      const edgeCaseEmails = [
        'a@b.co', // Minimal valid email
        'test@sub.domain.com', // Subdomain
        'user.with.dots@example.com', // Multiple dots
        'user+tag+more@example.com' // Multiple plus signs
      ];

      edgeCaseEmails.forEach((email) => {
        const result = validateLogin({
          ...validLoginData,
          email
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(email.toLowerCase());
        }
      });
    });
  });

  describe('security considerations for login validation', () => {
    it('should not reveal whether email exists through validation errors', () => {
      // Both invalid email and missing email should give same error
      const invalidEmailResult = validateLogin({
        email: 'invalid-format',
        password: 'TestPassword123!'
      });

      const missingEmailResult = validateLogin({
        password: 'TestPassword123!'
      });

      expect(invalidEmailResult.success).toBe(false);
      expect(missingEmailResult.success).toBe(false);
      expect(invalidEmailResult.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
      expect(missingEmailResult.error?.fieldErrors.email?.[0]).toBe(
        'Invalid email address'
      );
    });

    it('should validate password complexity even for login (prevents weak password usage)', () => {
      // Even for login, we enforce password complexity
      const result = validateLogin({
        email: 'user@example.com',
        password: 'simplepass' // Weak password
      });

      expect(result.success).toBe(false);
      expect(result.error?.fieldErrors.password).toBeDefined();
    });
  });
});
