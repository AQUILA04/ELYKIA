import { DEFAULT_POST_LOGIN_URL, readReturnUrlFromLocation, sanitizeReturnUrl } from './return-url';

describe('return-url', () => {
  describe('sanitizeReturnUrl', () => {
    it('accepts internal paths', () => {
      expect(sanitizeReturnUrl('/catalog')).toBe('/catalog');
      expect(sanitizeReturnUrl('/purchases/42?tab=1')).toBe('/purchases/42?tab=1');
    });

    it('rejects empty values', () => {
      expect(sanitizeReturnUrl(null)).toBeNull();
      expect(sanitizeReturnUrl(undefined)).toBeNull();
      expect(sanitizeReturnUrl('')).toBeNull();
      expect(sanitizeReturnUrl('   ')).toBeNull();
    });

    it('rejects external or protocol-relative urls', () => {
      expect(sanitizeReturnUrl('https://evil.example/catalog')).toBeNull();
      expect(sanitizeReturnUrl('//evil.example')).toBeNull();
      expect(sanitizeReturnUrl('/\\evil.example')).toBeNull();
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeReturnUrl('catalog')).toBeNull();
    });

    it('rejects login pages and root', () => {
      expect(sanitizeReturnUrl('/')).toBeNull();
      expect(sanitizeReturnUrl('/auth')).toBeNull();
      expect(sanitizeReturnUrl('/auth/')).toBeNull();
      expect(sanitizeReturnUrl('/auth?returnUrl=/catalog')).toBeNull();
    });
  });

  describe('readReturnUrlFromLocation', () => {
    afterEach(() => history.pushState({}, '', '/'));

    it('reads a valid returnUrl from the current location', () => {
      history.pushState({}, '', '/auth?returnUrl=%2Fcatalog');
      expect(readReturnUrlFromLocation()).toBe('/catalog');
    });

    it('returns null for an external returnUrl', () => {
      history.pushState({}, '', '/auth?returnUrl=https%3A%2F%2Fevil.example');
      expect(readReturnUrlFromLocation()).toBeNull();
    });

    it('returns null without returnUrl', () => {
      history.pushState({}, '', '/auth');
      expect(readReturnUrlFromLocation()).toBeNull();
      expect(DEFAULT_POST_LOGIN_URL).toBe('/dashboard');
    });
  });
});
