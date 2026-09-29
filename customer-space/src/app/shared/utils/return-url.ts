/** Page d'accueil après connexion quand aucune page de retour valide n'est demandée. */
export const DEFAULT_POST_LOGIN_URL = '/dashboard';

export const RETURN_URL_PARAM = 'returnUrl';

/**
 * N'accepte qu'un chemin interne à l'application (pas de redirection ouverte
 * vers un autre domaine) et ignore les pages de connexion.
 */
export function sanitizeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  const path = value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/auth' || path.startsWith('/auth/')) {
    return null;
  }
  return value;
}

/** Lit `returnUrl` dans l'URL courante du navigateur / de la WebView. */
export function readReturnUrlFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return sanitizeReturnUrl(params.get(RETURN_URL_PARAM));
}
