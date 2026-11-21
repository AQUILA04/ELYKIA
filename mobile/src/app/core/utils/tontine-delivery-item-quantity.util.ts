import { TontineDeliveryItem } from '../../models/tontine.model';

/**
 * Ligne de commande tontine dont on change la quantité d'un pas (+1 / −1).
 * Une ligne vendue en pack change d'un pack ; sinon d'une unité. Le prix de la ligne
 * suit au prorata. Renvoie `null` si la ligne tomberait à zéro (à retirer).
 */
export function stepTontineDeliveryItem<T extends Pick<TontineDeliveryItem,
  'quantity' | 'totalPrice' | 'unitPrice' | 'salePackMode' | 'packCount' | 'unitsPerPack'>>(
  item: T,
  delta: number
): T | null {
  const usesPack = !!item.salePackMode && item.salePackMode !== 'UNIT' && (item.packCount || 0) > 0;
  if (usesPack) {
    const packs = item.packCount || 1;
    const next = packs + delta;
    if (next < 1) {
      return null;
    }
    const perPack = packs > 0 ? (item.totalPrice || 0) / packs : (item.unitPrice || 0);
    return {
      ...item,
      packCount: next,
      quantity: next * (item.unitsPerPack || 1),
      totalPrice: perPack * next
    };
  }
  const next = item.quantity + delta;
  if (next < 1) {
    return null;
  }
  const perUnit = item.quantity > 0 ? (item.totalPrice || 0) / item.quantity : (item.unitPrice || 0);
  return {
    ...item,
    quantity: next,
    totalPrice: perUnit * next
  };
}

/** Quantité affichée : nombre de packs pour une ligne en pack, sinon unités. */
export function displayedTontineDeliveryQuantity(
  item: Pick<TontineDeliveryItem, 'quantity' | 'salePackMode' | 'packCount'>
): number {
  return item.salePackMode && item.salePackMode !== 'UNIT' && (item.packCount || 0) > 0
    ? (item.packCount || 0)
    : item.quantity;
}
