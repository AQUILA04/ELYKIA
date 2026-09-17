import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/** Shared Mobile Money declaration form (credit + tontine customer-space pages). */
export function createMobileMoneyPaymentForm(fb: FormBuilder): FormGroup {
  return fb.group({
    mobileMoneyPhone: ['', Validators.required],
    mobileMoneyAmount: [null, [Validators.required, Validators.min(1)]],
    mobileMoneyReference: ['', Validators.required],
    notes: [''],
  });
}

export function mobileMoneySubmitErrorMessage(error: unknown, fallback: string): string {
  const err = error as { error?: { message?: string } };
  return err?.error?.message ?? fallback;
}
