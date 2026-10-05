/**
 * Local offline-op id with a cryptographically strong suffix (not Math.random).
 */
export function createRmLocalOpId(prefix: string, entityId: number): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}-${entityId}-${Date.now()}-${hex}`;
}
