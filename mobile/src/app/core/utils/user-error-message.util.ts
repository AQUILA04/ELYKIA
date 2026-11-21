import { HttpErrorResponse } from '@angular/common/http';

/** Message par défaut quand ni le serveur ni l'erreur ne donnent un texte lisible. */
export const DEFAULT_USER_ERROR_MESSAGE = 'Une erreur est survenue. Réessayez.';

export const NETWORK_USER_ERROR_MESSAGE =
  'Le serveur ne répond pas. Vérifiez la connexion internet puis réessayez.';

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous puis réessayez.',
  403: 'Vous n\'avez pas le droit de faire cette opération.',
  404: 'Élément introuvable sur le serveur. Synchronisez puis réessayez.',
  409: 'Cette opération a déjà été enregistrée depuis un autre appareil.',
  413: 'Les données envoyées sont trop volumineuses.',
  500: 'Le serveur a rencontré une erreur. Réessayez dans un instant.',
  502: 'Le serveur est momentanément indisponible. Réessayez dans un instant.',
  503: 'Le serveur est momentanément indisponible. Réessayez dans un instant.',
  504: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
};

/**
 * Texte technique d'Angular ou du navigateur : jamais montré au commercial.
 * Ex. « Http failure response for https://…/items: 400 OK ».
 */
export function isTechnicalErrorText(text: string | null | undefined): boolean {
  if (!text) {
    return true;
  }
  const value = text.trim();
  return value === ''
    || /^Http failure/i.test(value)
    || /^Unknown Error$/i.test(value)
    || /^\s*</.test(value)
    || /Failed to fetch|NetworkError|ERR_[A-Z_]+|TypeError:|Cannot read propert|undefined is not|is not a function/i.test(value)
    || /^Timeout has occurred$/i.test(value);
}

/** Message renvoyé par le backend : `Response.message` (ApiResponse), ou corps texte. */
export function serverErrorMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.message === 'string' && !isTechnicalErrorText(parsed.message)) {
        return parsed.message.trim();
      }
    } catch {
      return isTechnicalErrorText(body) ? null : body.trim();
    }
    return null;
  }
  const candidates = [body?.message, body?.error?.message, body?.detail, Array.isArray(body?.errors) ? body.errors[0] : null];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && !isTechnicalErrorText(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * Message à afficher au commercial pour n'importe quelle erreur.
 * Priorité : message du backend, puis message métier d'une `Error`, puis message selon le statut HTTP.
 * Le texte brut d'Angular (« Http failure response … ») n'est jamais renvoyé.
 */
export function toUserErrorMessage(error: unknown, fallback: string = DEFAULT_USER_ERROR_MESSAGE): string {
  if (error === null || error === undefined) {
    return fallback;
  }
  if (typeof error === 'string') {
    return isTechnicalErrorText(error) ? fallback : error;
  }
  if (error instanceof HttpErrorResponse || isHttpErrorLike(error)) {
    const http = error as HttpErrorResponse;
    const fromServer = serverErrorMessage(http);
    if (fromServer) {
      return fromServer;
    }
    if (!http.status) {
      return NETWORK_USER_ERROR_MESSAGE;
    }
    return STATUS_MESSAGES[http.status] ?? fallback;
  }
  if (isTimeout(error)) {
    return NETWORK_USER_ERROR_MESSAGE;
  }
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && !isTechnicalErrorText(message)) {
    return message;
  }
  if (typeof message === 'string' && /Failed to fetch|NetworkError|Unknown Error|Timeout/i.test(message)) {
    return NETWORK_USER_ERROR_MESSAGE;
  }
  return fallback;
}

/** Erreur réseau (pas de réponse du serveur) : statut 0 ou délai dépassé. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse || isHttpErrorLike(error)) {
    return !(error as HttpErrorResponse).status;
  }
  return isTimeout(error);
}

function isHttpErrorLike(error: unknown): boolean {
  return typeof error === 'object' && error !== null
    && (error as { name?: string }).name === 'HttpErrorResponse'
    && 'status' in (error as object);
}

function isTimeout(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'TimeoutError';
}
