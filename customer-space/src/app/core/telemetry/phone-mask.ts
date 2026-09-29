/**
 * Masque un numéro de téléphone pour Firebase / Analytics.
 * Conserve le `+` éventuel, les 4 premiers et les 4 derniers chiffres ;
 * le milieu est remplacé par `****`.
 * Ex. `+22890001234` → `+2289****1234`.
 * Un numéro de 8 chiffres ou moins est entièrement masqué.
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (phone == null) {
    return null;
  }
  const trimmed = String(phone).trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) {
    return null;
  }
  if (digits.length <= 8) {
    return (hasPlus ? '+' : '') + '*'.repeat(Math.min(digits.length, 8));
  }

  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-4);
  return `${hasPlus ? '+' : ''}${prefix}****${suffix}`;
}
