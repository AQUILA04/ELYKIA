export function generateTontineDeliveryReference(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `LIV-${year}-${month}-${hex}`;
}
