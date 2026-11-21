/** Date du jour au format AAAA-MM-JJ (heure locale du téléphone, GMT à Lomé). */
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Date de livraison prévue saisie : AAAA-MM-JJ, ou `null` si le champ est vide ou mal formé.
 * Un champ date peut renvoyer une date-heure ISO : on n'en garde que le jour.
 */
export function normalizePlannedDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const day = String(value).trim().substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** AAAA-MM-JJ → JJ/MM/AAAA pour les reçus. */
export function formatPlannedDate(value?: string | null): string {
  const day = normalizePlannedDate(value);
  if (!day) {
    return '';
  }
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}
