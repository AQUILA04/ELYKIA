import { FormControl } from '@angular/forms';
import { togoMobilePhoneValidator } from './togo-phone.validator';

describe('togoMobilePhoneValidator', () => {
  const validate = (value: unknown) => togoMobilePhoneValidator()(new FormControl(value));

  it('ignores empty values (handled by required)', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it('accepts a Togolese mobile number', () => {
    expect(validate('90 12 34 56')).toBeNull();
    expect(validate('+22879123456')).toBeNull();
  });

  it('flags numbers with an unknown prefix or wrong length', () => {
    expect(validate('94123456')).toEqual({ togoPhone: true });
    expect(validate('9012345')).toEqual({ togoPhone: true });
  });
});
