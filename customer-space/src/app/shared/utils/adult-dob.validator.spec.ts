import { adultDateOfBirthValidator, underageErrorMessage, MIN_REGISTER_AGE_YEARS } from './adult-dob.validator';
import { FormControl } from '@angular/forms';

describe('adultDateOfBirthValidator', () => {
  const validate = adultDateOfBirthValidator();

  it('accepts empty (required handled separately)', () => {
    expect(validate(new FormControl(''))).toBeNull();
  });

  it('rejects underage dates immediately', () => {
    const today = new Date();
    const underage = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    const value = underage.toISOString().slice(0, 10);
    expect(validate(new FormControl(value))).toEqual({
      underage: { minAgeYears: MIN_REGISTER_AGE_YEARS },
    });
  });

  it('accepts majority age', () => {
    const today = new Date();
    const adult = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    expect(validate(new FormControl(adult.toISOString().slice(0, 10)))).toBeNull();
  });

  it('exposes clear message', () => {
    expect(underageErrorMessage()).toContain('majeur');
  });
});
