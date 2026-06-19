import { toUsername, toE164, formatDisplay } from './phone-normalizer';

describe('phone-normalizer', () => {
  it('toUsername strips +228 prefix', () => {
    expect(toUsername('+22890123456')).toBe('90123456');
  });

  it('toUsername strips leading zero', () => {
    expect(toUsername('090123456')).toBe('90123456');
  });

  it('toE164 adds country code', () => {
    expect(toE164('90123456')).toBe('+22890123456');
  });

  it('formatDisplay groups digits', () => {
    expect(formatDisplay('90123456')).toContain('90');
  });
});
