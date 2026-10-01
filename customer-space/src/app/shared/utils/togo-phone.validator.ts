import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidTogoMobile } from './phone-normalizer';

/** Valide un numéro mobile togolais (laisse `Validators.required` gérer le champ vide). */
export function togoMobilePhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    return isValidTogoMobile(String(raw)) ? null : { togoPhone: true };
  };
}
