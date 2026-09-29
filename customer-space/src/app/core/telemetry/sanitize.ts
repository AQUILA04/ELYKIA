const SENSITIVE_KEY_PATTERN =
  /^(pin|otp|code|password|passwd|token|authorization|bearer|secret|proof|otpprooftoken|firebaseidtoken|profilphoto|photo|file|content|body)$/i;

const SENSITIVE_KEY_CONTAINS = ['password', 'token', 'secret', 'pin', 'otp'];

/**
 * Supprime les secrets (PIN, OTP, tokens, contenus de fichiers) d'un objet
 * avant envoi vers Firebase ou le journal backend.
 */
export function sanitizeProps(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (props == null) {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isSensitiveKey(key)) {
      continue;
    }
    if (value == null) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeProps(value as Record<string, unknown>);
      continue;
    }
    if (typeof value === 'string' && value.length > 500) {
      out[key] = `${value.slice(0, 100)}…[truncated ${value.length}]`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function isSensitiveKey(key: string): boolean {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return true;
  }
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_CONTAINS.some((part) => lower.includes(part));
}
