import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../auth';

// Mock the ENV module
vi.mock('../env', () => ({
  ENV: {
    BCRYPT_SALT_ROUNDS: '10'
  }
}));

describe('hashPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hash a password successfully', async () => {
    const password = 'testPassword123';
    const hashedPassword = await hashPassword(password);

    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword.length).toBeGreaterThan(0);
  });

  it('should generate different hashes for the same password', async () => {
    const password = 'samePassword';

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
  });

  it('should generate valid bcrypt hash that can be verified', async () => {
    const password = 'verifiablePassword';
    const hashedPassword = await hashPassword(password);

    // Verify the hash can be compared back to the original password
    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);

    // Verify wrong password doesn't match
    const isInvalid = await bcrypt.compare('wrongPassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('should use the correct salt rounds from ENV', async () => {
    const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');
    const password = 'testPassword';

    await hashPassword(password);

    expect(bcryptHashSpy).toHaveBeenCalledWith(password, 10);
    expect(bcryptHashSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw error if bcrypt.hash fails', async () => {
    const bcryptHashSpy = vi
      .spyOn(bcrypt, 'hash')
      .mockRejectedValue(new Error('Bcrypt error'));

    await expect(hashPassword('testPassword')).rejects.toThrow('Bcrypt error');
    expect(bcryptHashSpy).toHaveBeenCalledTimes(1);
  });
});
