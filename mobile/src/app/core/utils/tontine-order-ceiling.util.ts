/** Tolérance d'arrondi, identique au serveur (`TontineProjectedBalanceCalculator.MONEY_TOLERANCE`). */
export const TONTINE_MONEY_TOLERANCE = 0.001;

export interface TontineOrderCeiling {
  /** Plafond : le plus grand du solde prévisionnel et du solde net cotisé. */
  ceiling: number;
  projected: number;
  available: number;
}

export function computeTontineOrderCeiling(projected: number | null | undefined, available: number | null | undefined): TontineOrderCeiling {
  const p = Math.max(0, Number(projected) || 0);
  const a = Math.max(0, Number(available) || 0);
  return { ceiling: Math.max(p, a), projected: p, available: a };
}

/** Montant au-delà du plafond (0 si la commande tient dans le plafond). */
export function tontineCeilingExcess(total: number, ceiling: number): number {
  const excess = (Number(total) || 0) - (Number(ceiling) || 0);
  return excess > TONTINE_MONEY_TOLERANCE ? excess : 0;
}

/** Montant FCFA au format français : « 12 800 FCFA » (espace simple). */
export function formatFcfa(amount: number | null | undefined): string {
  const value = Math.round(Number(amount) || 0);
  const digits = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${value < 0 ? '-' : ''}${digits} FCFA`;
}

/** Même message que le serveur (`TontineDeliveryService.ceilingExceededMessage`). */
export function tontineCeilingExceededMessage(total: number, ceiling: number): string {
  return `La commande (${formatFcfa(total)}) dépasse le plafond de ce membre (${formatFcfa(ceiling)}) `
    + `de ${formatFcfa(tontineCeilingExcess(total, ceiling))}. `
    + 'Le plafond est le plus grand du solde prévisionnel et du solde net cotisé. Réduisez la commande.';
}
