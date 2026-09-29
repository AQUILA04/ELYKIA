/**
 * Configuration lue au démarrage depuis `assets/env.js` (image web Contabo).
 * Le placeholder non remplacé signifie « pas de configuration runtime ».
 */
export const RUNTIME_API_URL_PLACEHOLDER = '__CUSTOMER_SPACE_API_URL__';

interface CustomerSpaceRuntimeEnv {
  apiUrl?: string;
}

export function resolveRuntimeApiUrl(fallback: string): string {
  const runtimeEnv = (globalThis as { __CUSTOMER_SPACE_ENV__?: CustomerSpaceRuntimeEnv })
    .__CUSTOMER_SPACE_ENV__;
  const value = runtimeEnv?.apiUrl?.trim();
  if (!value || value.includes(RUNTIME_API_URL_PLACEHOLDER)) {
    return fallback;
  }
  return value.replace(/\/+$/, '');
}
