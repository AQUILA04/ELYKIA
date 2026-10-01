import { toUsername, toE164, formatDisplay, isValidTogoMobile } from './phone-normalizer';

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

  describe('isValidTogoMobile', () => {
    const validPrefixes = ['90', '91', '92', '93', '96', '97', '98', '99', '70', '71', '78', '79'];

    validPrefixes.forEach((prefix) => {
      it(`accepts prefix ${prefix}`, () => {
        expect(isValidTogoMobile(`${prefix}123456`)).toBeTrue();
      });
    });

    it('accepts formatted numbers with country code or leading zero', () => {
      expect(isValidTogoMobile('+228 90 12 34 56')).toBeTrue();
      expect(isValidTogoMobile('22870123456')).toBeTrue();
      expect(isValidTogoMobile('090123456')).toBeTrue();
    });

    ['94123456', '95123456', '72123456', '80123456', '22123456', '9012345', '901234567', '', null, undefined]
      .forEach((value) => {
        it(`rejects ${JSON.stringify(value)}`, () => {
          expect(isValidTogoMobile(value)).toBeFalse();
        });
      });
  });
});
