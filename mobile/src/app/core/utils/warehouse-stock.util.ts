/**
 * Libellé du stock magasin d'un article du catalogue, avec l'heure de sa lecture :
 * le stock peut changer en magasin entre la lecture et la commande.
 */
export function warehouseStockLabel(
  quantity: number | null | undefined,
  readAt: string | null | undefined,
  now: Date = new Date()
): string {
  if (quantity === null || quantity === undefined) {
    return 'Stock magasin : non connu';
  }
  const read = readAt ? new Date(readAt) : null;
  if (!read || Number.isNaN(read.getTime())) {
    return `Stock magasin : ${quantity}`;
  }
  const time = read.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = read.toDateString() === now.toDateString();
  const when = sameDay
    ? `à ${time}`
    : `le ${read.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${time}`;
  return `Stock magasin : ${quantity} (lu ${when})`;
}
