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

/** Article ajouté depuis la fenêtre « Ajouter un article » (stock tontine ou catalogue). */
export interface TontineLinePick {
  articleId: string;
  articleName: string;
  unitPrice: number;
}

/**
 * Ajoute une unité de l'article à la commande en cours d'édition : la ligne à l'unité du même article
 * est augmentée, sinon une nouvelle ligne est créée. La liste d'origine n'est pas modifiée.
 */
export function addTontineLinePick<T extends TontineDeliveryItem>(
  lines: T[],
  pick: TontineLinePick,
  tontineDeliveryId: string,
  newId: () => string = defaultLineId
): T[] {
  const index = lines.findIndex(line => String(line.articleId) === String(pick.articleId)
    && (!line.salePackMode || line.salePackMode === 'UNIT'));
  if (index >= 0) {
    const next = stepTontineDeliveryItem(lines[index], 1);
    return lines.map((line, i) => (i === index && next ? next : line));
  }
  const unitPrice = Number(pick.unitPrice) || 0;
  const added = {
    id: newId(),
    tontineDeliveryId,
    articleId: String(pick.articleId),
    articleName: pick.articleName,
    quantity: 1,
    unitPrice,
    totalPrice: unitPrice,
    salePackMode: 'UNIT'
  } as T;
  return [...lines, added];
}

/** Quantités par article (unités) d'une commande, pour la fenêtre d'ajout. */
export function tontineQuantitiesByArticle(lines: Array<Pick<TontineDeliveryItem, 'articleId' | 'quantity'>>): Record<string, number> {
  return lines.reduce((acc, line) => {
    const key = String(line.articleId);
    acc[key] = (acc[key] ?? 0) + (Number(line.quantity) || 0);
    return acc;
  }, {} as Record<string, number>);
}

/** Identifiant local d'une ligne ajoutée (générateur cryptographique, jamais `Math.random`). */
function defaultLineId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return uuid;
  }
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `tdi-new-${Date.now()}-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}
