import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Âge minimum pour l'inscription espace client (majeur). */
export const MIN_REGISTER_AGE_YEARS = 18;

/**
 * Valide qu'une date de naissance (yyyy-mm-dd) correspond à un âge ≥ {@link MIN_REGISTER_AGE_YEARS}.
 */
export function adultDateOfBirthValidator(minAgeYears = MIN_REGISTER_AGE_YEARS): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || raw === '') {
      return null;
    }
    const dob = parseLocalDate(String(raw));
    if (!dob) {
      return { invalidDate: true };
    }
    const today = new Date();
    const majorityCutoff = new Date(
      today.getFullYear() - minAgeYears,
      today.getMonth(),
      today.getDate(),
    );
    if (dob > majorityCutoff) {
      return { underage: { minAgeYears } };
    }
    return null;
  };
}

export function underageErrorMessage(minAgeYears = MIN_REGISTER_AGE_YEARS): string {
  return `Vous devez être majeur (${minAgeYears} ans ou plus).`;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}
