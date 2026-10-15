// Pure unit tests: no database needed for this file's logic, but the shared setup still applies.
import { describe, it, expect } from 'vitest';
import { passwordPolicyIssues } from '../src/validators/password.js';
import { hashToken, safeEqual } from '../src/services/tokenService.js';

describe('password policy', () => {
  it('accepts a strong password', () => {
    expect(passwordPolicyIssues('Str0ng!Passphrase#1')).toEqual([]);
  });
  it('rejects short passwords', () => {
    expect(passwordPolicyIssues('Ab1!').length).toBeGreaterThan(0);
  });
  it('rejects low character variety', () => {
    expect(passwordPolicyIssues('alllowercaseletters').length).toBeGreaterThan(0);
  });
  it('rejects non-strings', () => {
    expect(passwordPolicyIssues(undefined).length).toBeGreaterThan(0);
  });
});

describe('token helpers', () => {
  it('hashes deterministically and never returns the input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
  });
  it('compares in a length-safe way', () => {
    expect(safeEqual('a', 'a')).toBe(true);
    expect(safeEqual('a', 'ab')).toBe(false);
  });
});
