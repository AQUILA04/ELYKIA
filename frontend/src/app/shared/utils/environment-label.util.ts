/**
 * Résout le libellé d'environnement à afficher (ruban / bandeau).
 * Retourne null en production → rien n'est affiché.
 */
export function resolveEnvironmentLabel(options: {
  envName?: string | null;
  apiUrl?: string | null;
  hostname?: string | null;
}): string | null {
  const explicit = normalizeLabel(options.envName);
  if (explicit !== undefined) {
    return explicit;
  }

  const host = (options.hostname || '').trim().toLowerCase();
  const api = (options.apiUrl || '').trim().toLowerCase();
  const haystack = `${host} ${api}`;

  if (looksLikeProd(haystack) && !looksLikeNonProd(haystack)) {
    return null;
  }
  if (haystack.includes('formation')) {
    return 'FORMATION';
  }
  if (haystack.includes('uat')) {
    return 'UAT';
  }
  if (looksLikeNonProd(haystack)) {
    if (haystack.includes('localhost') || haystack.includes('127.0.0.1') || /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./.test(haystack)) {
      return 'DEV';
    }
    return 'TEST';
  }

  return null;
}

function normalizeLabel(raw?: string | null): string | null | undefined {
  if (raw == null) {
    return undefined;
  }
  const value = String(raw).trim();
  if (!value || value === '__APP_ENV__') {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === 'prod' || lower === 'production') {
    return null;
  }
  if (lower === 'dev' || lower === 'development' || lower === 'local') {
    return 'DEV';
  }
  if (lower === 'test' || lower === 'testing') {
    return 'TEST';
  }
  return value.toUpperCase();
}

function looksLikeNonProd(haystack: string): boolean {
  return (
    haystack.includes('-test') ||
    haystack.includes('elykia-test') ||
    haystack.includes('localhost') ||
    haystack.includes('127.0.0.1') ||
    /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./.test(haystack) ||
    haystack.includes('formation') ||
    haystack.includes('uat')
  );
}

function looksLikeProd(haystack: string): boolean {
  return (
    haystack.includes('elykia.amenouveve-yaveh.com') ||
    (haystack.includes('amenouveve-yaveh.com') && !haystack.includes('-test'))
  );
}
