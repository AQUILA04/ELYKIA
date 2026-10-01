/** Normalise les numéros Togo (+228) — username local sans indicatif. */

const COUNTRY_CODE = '228';

/** Mobile Togo : 8 chiffres, préfixes 90-93, 96-99, 70, 71, 78, 79 (aligné backend `PhoneNormalizer`). */
const TOGO_MOBILE_PATTERN = /^(70|71|78|79|9[0-3]|9[6-9])\d{6}$/;

export const INVALID_TOGO_PHONE_MESSAGE = 'Veuillez saisir un numéro togolais valide.';

export function toUsername(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith(COUNTRY_CODE) && digits.length > COUNTRY_CODE.length) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  while (digits.startsWith('0') && digits.length > 1) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidTogoMobile(raw: string | null | undefined): boolean {
  return TOGO_MOBILE_PATTERN.test(toUsername(raw ?? ''));
}

export function toE164(username: string): string {
  const local = toUsername(username);
  return local ? `+${COUNTRY_CODE}${local}` : '';
}

export function formatDisplay(username: string): string {
  const local = toUsername(username);
  if (local.length <= 2) return local;
  return local.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
