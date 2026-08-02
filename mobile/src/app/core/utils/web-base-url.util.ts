/**
 * Derive the web frontend base URL from the mobile API base URL.
 * Strips a trailing `/api` (with or without slash) when present.
 * On localhost / 127.0.0.1, maps Spring port 8081 → Angular port 4200.
 */
export function getWebBaseUrl(apiUrl: string): string {
  const trimmed = (apiUrl || '').trim().replace(/\/+$/, '');
  let base = trimmed.replace(/\/api$/i, '');

  try {
    const url = new URL(base);
    const host = url.hostname.toLowerCase();
    if ((host === 'localhost' || host === '127.0.0.1') && url.port === '8081') {
      url.port = '4200';
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    base = base.replace(/^(https?:\/\/(?:localhost|127\.0\.0\.1)):8081\b/i, '$1:4200');
  }

  return base;
}
