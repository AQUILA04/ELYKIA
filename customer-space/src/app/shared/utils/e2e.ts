/** Détecte le mode E2E (Playwright injecte window.__E2E__). */
export function isE2eMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as Window & { __E2E__?: boolean }).__E2E__;
}
