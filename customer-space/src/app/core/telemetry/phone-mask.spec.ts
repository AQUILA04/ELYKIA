import { maskPhone } from './phone-mask';

describe('maskPhone', () => {
  it('keeps plus, first 4 and last 4 digits', () => {
    expect(maskPhone('+22890001234')).toBe('+2289****1234');
  });

  it('works without plus', () => {
    expect(maskPhone('22890001234')).toBe('2289****1234');
  });

  it('fully masks short numbers', () => {
    expect(maskPhone('+2289012')).toBe('+*******');
    expect(maskPhone('90123456')).toBe('********');
  });

  it('returns null for empty', () => {
    expect(maskPhone('')).toBeNull();
    expect(maskPhone(null)).toBeNull();
  });
});
