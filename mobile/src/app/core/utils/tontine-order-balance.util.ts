/**
 * Soldes affichés sur tout reçu ou détail de commande tontine (même règle que le serveur,
 * `TontineOrderBalance`).
 * - solde net cotisé : cotisations moins la part société, compléments inclus ;
 * - reste à payer : la commande dépasse le solde (sinon 0) ;
 * - reliquat à restituer : la commande est inférieure au solde (sinon 0).
 */
export interface TontineOrderBalance {
  netContribution: number;
  orderTotal: number;
  amountDue: number;
  refundableBalance: number;
}

const EPSILON = 0.005;

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTontineOrderBalance(
  netContribution: number | null | undefined,
  orderTotal: number | null | undefined
): TontineOrderBalance {
  const net = roundAmount(Math.max(0, Number(netContribution) || 0));
  const total = roundAmount(Math.max(0, Number(orderTotal) || 0));
  const gap = total - net;
  return {
    netContribution: net,
    orderTotal: total,
    amountDue: gap > EPSILON ? roundAmount(gap) : 0,
    refundableBalance: gap < -EPSILON ? roundAmount(-gap) : 0
  };
}

/** Libellés : une commande remise parle de total cotisé, utilisé et restant. */
export function tontineOrderBalanceLabels(delivered: boolean): {
  net: string;
  total: string;
  due: string;
  refundable: string;
} {
  return delivered
    ? { net: 'Total cotisé (net)', total: 'Total utilisé', due: 'Reste à payer', refundable: 'Total restant' }
    : { net: 'Solde net cotisé', total: 'Montant de la commande', due: 'Reste à payer', refundable: 'Reliquat à restituer' };
}
