import { DebtDocument } from '@features/debt/models/debt.model';
import { CommercialMonthlyStockItem } from '../models/commercial-stock.model';

/** Ligne du reste à régulariser, valorisée comme la future dette marchandise. */
export interface RegularisationLine {
  item: CommercialMonthlyStockItem;
  quantity: number;
  /** PMP de vente arrondi au franc supérieur (règle du serveur). */
  unitPrice: number;
  amount: number;
}

export type StepState = 'done' | 'current' | 'todo';

export interface LifecycleStep {
  title: string;
  detail: string;
  state: StepState;
}

/** Montant d'une dette marchandise : quantité × PMP arrondi, arrondi au franc supérieur (comme le serveur). */
export function debtAmount(quantity: number, weightedAverageUnitPrice: number): number {
  return Math.ceil(quantity * Math.ceil(weightedAverageUnitPrice || 0));
}

export function regularisationLines(items: CommercialMonthlyStockItem[]): RegularisationLine[] {
  return items
    .filter(item => (item.quantityRemaining || 0) > 0)
    .map(item => ({
      item,
      quantity: item.quantityRemaining,
      unitPrice: Math.ceil(item.weightedAverageUnitPrice || 0),
      amount: debtAmount(item.quantityRemaining, item.weightedAverageUnitPrice)
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function linesTotal(lines: RegularisationLine[]): { quantity: number; amount: number } {
  return lines.reduce((total, line) => ({
    quantity: total.quantity + line.quantity,
    amount: total.amount + line.amount
  }), { quantity: 0, amount: 0 });
}

export function isActiveDebt(debt: DebtDocument | null | undefined): debt is DebtDocument {
  return !!debt && debt.status !== 'CANCELLED';
}

/** Une dette se règle tant qu'il reste un montant à payer. */
export function canSettleDebt(debt: DebtDocument | null | undefined): boolean {
  return isActiveDebt(debt) && debt.status !== 'SETTLED' && (debt.remainingAmount || 0) > 0.5;
}

/** Une dette s'annule tant qu'aucun règlement n'est enregistré. */
export function canCancelDebt(debt: DebtDocument | null | undefined): boolean {
  return isActiveDebt(debt) && debt.status === 'OPEN' && !(debt.paidAmount || 0) && !(debt.offsetAmount || 0);
}

export function settledShare(debt: DebtDocument): number {
  const gross = debt.grossAmount || 0;
  if (gross <= 0) {
    return 0;
  }
  const settled = (debt.paidAmount || 0) + (debt.offsetAmount || 0);
  return Math.max(0, Math.min(100, Math.round((settled / gross) * 100)));
}

/** Les cinq étapes du mois : sorties, ventes et retours, clôture, régularisation du reste, dette soldée. */
export function lifecycle(input: {
  closed: boolean;
  soldRate: number;
  remainingQuantity: number;
  debt: DebtDocument | null;
}): LifecycleStep[] {
  const { closed, soldRate, remainingQuantity, debt } = input;
  const active = isActiveDebt(debt) ? debt : null;
  const regularised = closed && remainingQuantity <= 0;
  let settleState: StepState = 'todo';
  let settleDetail = 'espèces, avoir ou abandon';
  if (active) {
    settleState = active.status === 'SETTLED' ? 'done' : (regularised ? 'current' : 'todo');
    settleDetail = active.status === 'SETTLED' ? 'dette réglée' : 'espèces, avoir ou abandon';
  } else if (regularised) {
    settleState = 'done';
    settleDetail = 'aucune dette à régler';
  }
  let regulariseState: StepState = 'todo';
  if (regularised) {
    regulariseState = 'done';
  } else if (closed) {
    regulariseState = 'current';
  }
  return [
    { title: 'Sorties magasin', detail: 'stock pris pendant le mois', state: 'done' },
    { title: 'Ventes et retours', detail: `${Math.round(soldRate)} % écoulé`, state: closed ? 'done' : 'current' },
    { title: 'Clôture', detail: closed ? 'automatique, fin du mois' : 'à la fin du mois', state: closed ? 'done' : 'todo' },
    { title: 'Régularisation du reste', detail: regularised ? 'rien ne reste' : 'retour ou dette', state: regulariseState },
    { title: 'Dette soldée', detail: settleDetail, state: settleState }
  ];
}
