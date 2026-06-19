/** Normalise les numéros Togo (+228) — username local sans indicatif. */

const COUNTRY_CODE = '228';

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

export function toE164(username: string): string {
  const local = toUsername(username);
  return local ? `+${COUNTRY_CODE}${local}` : '';
}

export function formatDisplay(username: string): string {
  const local = toUsername(username);
  if (local.length <= 2) return local;
  return local.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
