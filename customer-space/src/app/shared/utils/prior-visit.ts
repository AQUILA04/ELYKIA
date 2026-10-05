/**
 * Distingue une première ouverture d'un retour.
 * L'instantané est pris avant qu'Angular n'écrive ses propres clés (identifiant d'appareil, journal).
 */

const VISIT_MARK_KEY = 'elykia_customer_visited';
const TRACE_PREFIX = 'elykia_customer_';

/** Instantané de la visite en cours (sessionStorage) : '1' si une trace existait déjà. */
export const PRIOR_VISIT_SNAPSHOT_KEY = 'elykia_customer_prior_visit';

export function capturePriorVisit(): void {
  try {
    const prior = hasStoredTrace();
    sessionStorage.setItem(PRIOR_VISIT_SNAPSHOT_KEY, prior ? '1' : '0');
    localStorage.setItem(VISIT_MARK_KEY, '1');
  } catch {
    // Navigation privée ou stockage indisponible : on traite comme une première visite.
  }
}

export function isReturningVisitor(): boolean {
  try {
    return sessionStorage.getItem(PRIOR_VISIT_SNAPSHOT_KEY) === '1';
  } catch {
    return false;
  }
}

function hasStoredTrace(): boolean {
  if (localStorage.getItem(VISIT_MARK_KEY) === '1') {
    return true;
  }
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(TRACE_PREFIX)) {
      return true;
    }
  }
  return false;
}
