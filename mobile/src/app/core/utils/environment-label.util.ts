/**
 * Résout le libellé d'environnement à afficher (bandeau).
 * Retourne null en production → rien n'est affiché.
 */
export function resolveEnvironmentLabel(options: {
  envName?: string | null;
  apiUrl?: string | null;
}): string | null {
  const explicit = normalizeLabel(options.envName);
  if (explicit !== undefined) {
    return explicit;
  }

  const api = (options.apiUrl || '').trim().toLowerCase();
  if (!api) {
    return null;
  }
  if (api.includes('formation')) {
    return 'FORMATION';
  }
  if (api.includes('uat')) {
    return 'UAT';
  }
  if (looksLikeNonProd(api)) {
    if (
      api.includes('localhost') ||
      api.includes('127.0.0.1') ||
      /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./.test(api)
    ) {
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
  if (!value) {
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

function looksLikeNonProd(api: string): boolean {
  return (
    api.includes('-test') ||
    api.includes('elykia-test') ||
    api.includes('localhost') ||
    api.includes('127.0.0.1') ||
    /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./.test(api) ||
    api.includes('formation') ||
    api.includes('uat')
  );
}
