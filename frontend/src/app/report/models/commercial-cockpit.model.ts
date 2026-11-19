import { DailyCommercialReport } from './daily-commercial-report.model';

/** Situation d'un commercial sur la période (calculée par le serveur). */
export type ReconciliationStatus = 'LATE' | 'SURPLUS' | 'UP_TO_DATE' | 'INACTIVE';

export type CockpitAlertType = 'REMAINING' | 'CATCHUP_NOT_DEPOSITED' | 'SURPLUS' | 'HISTORICAL_REMAINING';

/** Rapprochement d'un commercial : A Verser + rattrapages saisis = dû à la caisse ; dû − versé = reste. */
export interface CommercialReconciliationLine {
    commercialUsername: string;
    status: ReconciliationStatus;
    creditToDeposit: number;
    tontineToDeposit: number;
    newBalanceToDeposit: number;
    amountToDeposit: number;
    catchupEntered: number;
    cashDue: number;
    deposited: number;
    catchupReceived: number;
    deferred: number;
    cashReceived: number;
    surplus: number;
    remainingCredit: number;
    remainingTontine: number;
    remainingNewBalance: number;
    remainingCatchup: number;
    remaining: number;
    historicalRemaining: number;
    operationsCount: number;
}

export interface CockpitTotals {
    cashDue: number;
    amountToDeposit: number;
    catchupEntered: number;
    cashReceived: number;
    deposited: number;
    remaining: number;
    surplus: number;
    historicalRemaining: number;
    depositRate: number;
    creditCollected: number;
    tontineCollected: number;
    newBalance: number;
    operationsCount: number;
    commercialsCount: number;
}

export interface CockpitCash {
    received: number;
    expensesWithSupply: number;
    expensesWithoutSupply: number;
    balance: number;
}

export interface CockpitAlert {
    type: CockpitAlertType;
    commercialUsername: string;
    amount: number;
    canRebalance: boolean;
}

export interface CommercialCockpit {
    startDate: string;
    endDate: string;
    totals: CockpitTotals;
    previousTotals: CockpitTotals | null;
    cash: CockpitCash | null;
    lines: CommercialReconciliationLine[];
    alerts: CockpitAlert[];
}

export interface DailyPoint {
    date: string;
    amountToDeposit: number;
    deposited: number;
}

export interface CommercialReportSummary {
    startDate: string;
    endDate: string;
    line: CommercialReconciliationLine;
    activity: DailyCommercialReport | null;
    series: DailyPoint[];
}

export interface TeamYearlySummary {
    year: number;
    commercialsCount: number;
    entrustedPortfolioAmount: number;
    creditDepositedAmount: number;
    remainingAtCommercialAmount: number;
    remainingAtClientAmount: number;
    merchandiseDebtGlobalAmount: number;
    merchandiseDebtSettledAmount: number;
}

export const STATUS_LABELS: Record<ReconciliationStatus, string> = {
    LATE: 'En retard',
    SURPLUS: 'Surplus',
    UP_TO_DATE: 'À jour',
    INACTIVE: 'Inactif'
};

export const ALERT_LABELS: Record<CockpitAlertType, string> = {
    REMAINING: 'non versés',
    CATCHUP_NOT_DEPOSITED: 'de rattrapages non versés',
    SURPLUS: 'de surplus à équilibrer',
    HISTORICAL_REMAINING: 'de manquants antérieurs'
};

/** Variation en % entre deux montants ; null si la référence est nulle. */
export function variationPercent(current: number, previous: number | null | undefined): number | null {
    if (previous == null || Math.abs(previous) < 0.01) {
        return null;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
}

/** Nombre de commerciaux par statut, pour les pastilles du tableau équipe. */
export function countByStatus(lines: ReadonlyArray<CommercialReconciliationLine>): Record<ReconciliationStatus, number> {
    const counts: Record<ReconciliationStatus, number> = { LATE: 0, SURPLUS: 0, UP_TO_DATE: 0, INACTIVE: 0 };
    for (const line of lines) {
        counts[line.status] = (counts[line.status] || 0) + 1;
    }
    return counts;
}

/** Part en % de chaque origine d'encaissement (crédit, tontine, solde Nx, rattrapages). */
export function encashmentShares(totals: CockpitTotals): { credit: number; tontine: number; newBalance: number; catchup: number } {
    const credit = Math.max(0, totals.creditCollected || 0);
    const tontine = Math.max(0, totals.tontineCollected || 0);
    const newBalance = Math.max(0, totals.newBalance || 0);
    const catchup = Math.max(0, totals.catchupEntered || 0);
    const sum = credit + tontine + newBalance + catchup;
    if (sum <= 0) {
        return { credit: 0, tontine: 0, newBalance: 0, catchup: 0 };
    }
    return {
        credit: (credit / sum) * 100,
        tontine: (tontine / sum) * 100,
        newBalance: (newBalance / sum) * 100,
        catchup: (catchup / sum) * 100
    };
}
