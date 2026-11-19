export const APPROVISIONNEMENT_EXPENSE_TYPE = 'Approvisionnement';

export function isSupplyExpense(typeName?: string | null): boolean {
    return (typeName || '').trim().toLowerCase() === APPROVISIONNEMENT_EXPENSE_TYPE.toLowerCase();
}

export function sumExpenseAmounts(
    expenses: ReadonlyArray<{ amount?: number | string | null; expenseTypeName?: string | null }>,
    options?: { excludeSupply?: boolean }
): number {
    return expenses.reduce((sum, expense) => {
        if (options?.excludeSupply && isSupplyExpense(expense.expenseTypeName)) {
            return sum;
        }
        const amount = Number(expense.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}

export function depositedForCashDesk(reportTotal: number, catchupAdjustment: number): number {
    return (Number(reportTotal) || 0) + (Number(catchupAdjustment) || 0);
}

export function cashDeskBalance(totalDeposited: number, expensesWithoutSupply: number): number {
    return (Number(totalDeposited) || 0) - (Number(expensesWithoutSupply) || 0);
}

/** Ajustement rattrapages d'un commercial sur la période. */
export interface CatchupCashAdjustmentLine {
    commercialUsername: string;
    /** Remis pendant la période pour des cotisations de jours hors période. */
    catchupReceivedAmount: number;
    /** Cotisations de la période remises après (ou avant) la période. */
    deferredAmount: number;
    /** Rattrapages saisis pendant la période pour une cotisation hors période. */
    catchupEnteredAmount: number;
}

export interface CatchupCashAdjustment {
    /** Écart net : rattrapages reçus moins montants différés. */
    amount: number;
    catchupReceivedAmount: number;
    deferredAmount: number;
    /** Rattrapages saisis pendant la période pour une cotisation hors période (dus à la caisse). */
    catchupEnteredAmount: number;
    byCommercial: CatchupCashAdjustmentLine[];
}

export const EMPTY_CATCHUP_CASH_ADJUSTMENT: CatchupCashAdjustment = {
    amount: 0,
    catchupReceivedAmount: 0,
    deferredAmount: 0,
    catchupEnteredAmount: 0,
    byCommercial: []
};

/** Normalise la réponse serveur (champs absents, chaînes numériques). */
/** Réponse serveur tolérée : anciens serveurs sans {@code catchupEnteredAmount}. */
export type CatchupCashAdjustmentBody = Partial<Omit<CatchupCashAdjustment, 'byCommercial'>> & {
    byCommercial?: Partial<CatchupCashAdjustmentLine>[];
};

export function normalizeCatchupCashAdjustment(
    body?: CatchupCashAdjustmentBody | null
): CatchupCashAdjustment {
    if (!body) {
        return { ...EMPTY_CATCHUP_CASH_ADJUSTMENT, byCommercial: [] };
    }
    const received = Number(body.catchupReceivedAmount) || 0;
    const deferred = Number(body.deferredAmount) || 0;
    return {
        amount: Number.isFinite(Number(body.amount)) && body.amount !== undefined
            ? Number(body.amount)
            : received - deferred,
        catchupReceivedAmount: received,
        deferredAmount: deferred,
        catchupEnteredAmount: Number(body.catchupEnteredAmount) || 0,
        byCommercial: (body.byCommercial || []).map(line => ({
            commercialUsername: line.commercialUsername || '',
            catchupReceivedAmount: Number(line.catchupReceivedAmount) || 0,
            deferredAmount: Number(line.deferredAmount) || 0,
            catchupEnteredAmount: Number(line.catchupEnteredAmount) || 0
        }))
    };
}

export interface CashEncaisseBreakdown {
    /** Argent réellement encaissé pendant la période. */
    total: number;
    /** Part qui appartient aux opérations de la période. */
    operations: number;
    /** Part remise pour des cotisations de jours passés (rattrapages). */
    catchups: number;
    /** Cotisations de la période remises hors période (déduites des opérations). */
    deferred: number;
}

/**
 * Ventile le total encaissé : opérations de la période et rattrapages.
 * Exemple : 150 000 rattachés au jour + 50 000 de rattrapages = 200 000 encaissés.
 */
export function cashEncaisseBreakdown(
    reportTotal: number,
    catchupReceived: number,
    deferred: number
): CashEncaisseBreakdown {
    const reported = Number(reportTotal) || 0;
    const catchups = Number(catchupReceived) || 0;
    const late = Number(deferred) || 0;
    const operations = reported - late;
    return { total: operations + catchups, operations, catchups, deferred: late };
}

export interface CashDueBreakdown {
    /** Dû à la caisse : dû de la période + rattrapages saisis hors période. */
    total: number;
    /** Dû de la période (« A Verser »). */
    operations: number;
    /** Rattrapages saisis pendant la période pour des jours passés. */
    catchups: number;
}

/**
 * Dû à la caisse = A Verser de la période + rattrapages saisis hors période.
 * Les cotisations de la période saisies plus tard sont déjà dans « A Verser » : pas de double compte.
 */
export function cashDueBreakdown(totalAmountToDeposit: number, catchupEntered: number): CashDueBreakdown {
    const operations = Number(totalAmountToDeposit) || 0;
    const catchups = Number(catchupEntered) || 0;
    return { total: operations + catchups, operations, catchups };
}
