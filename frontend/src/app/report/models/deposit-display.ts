/** Ligne de versement telle que renvoyée par GET api/cash-deposits. */
export interface CashDepositRow {
    id: number;
    date: string;
    createdAt?: string;
    captureDate?: string | null;
    commercialUsername: string;
    receivedBy?: string;
    reference?: string;
    amount: number;
    creditAmount?: number | null;
    tontineAmount?: number | null;
    newBalanceAmount?: number | null;
    surplusAmount?: number | null;
    physicalAmount?: number | null;
    parentDepositId?: number | null;
    catchupAllocations?: { date: string; amount: number }[] | null;
}

export interface CashDepositTotals {
    depositsCount: number;
    amount: number;
    creditAmount: number;
    tontineAmount: number;
    newBalanceAmount: number;
    surplusAmount: number;
}

/**
 * Lignes à afficher : une ligne de rattrapage rattachée à un versement de la période
 * est déjà détaillée sous son versement ; on ne la garde que si le versement est hors période.
 * Même règle que l'ancienne présentation.
 */
export function visibleDeposits(deposits: CashDepositRow[], start: string, end: string): CashDepositRow[] {
    return deposits.filter(dep => {
        if (!dep.parentDepositId || !dep.captureDate || !start || !end) {
            return true;
        }
        return dep.captureDate < start || dep.captureDate > end;
    });
}

/** Total physique du versement (rattrapages compris). */
export function depositTotal(dep: CashDepositRow): number {
    return dep.physicalAmount != null ? dep.physicalAmount : (dep.amount || 0);
}

/** Tontine du versement, rattrapages compris. */
export function depositTontine(dep: CashDepositRow): number {
    const extra = (dep.catchupAllocations || []).reduce((sum, slice) => sum + (slice.amount || 0), 0);
    return (dep.tontineAmount || 0) + extra;
}

/** Rattrapages répartis par ce versement. */
export function depositCatchup(dep: CashDepositRow): number {
    return (dep.catchupAllocations || []).reduce((sum, slice) => sum + (slice.amount || 0), 0);
}

/** Versement saisi un autre jour que sa date comptable, sans répartition affichée. */
export function showCaptureHint(dep: CashDepositRow): boolean {
    return !!dep.captureDate && dep.captureDate !== dep.date && !dep.catchupAllocations?.length;
}

/**
 * Annulation : gestionnaire dans les 3 jours suivant l'encaissement, administrateur sans délai ;
 * jamais une annulation ni un versement déjà annulé.
 */
export function canCancelDeposit(
    dep: CashDepositRow,
    page: CashDepositRow[],
    role: { isManager: boolean; isAdmin: boolean },
    today: Date = new Date()
): boolean {
    if (!(role.isManager || role.isAdmin) || depositTotal(dep) <= 0) {
        return false;
    }
    const reference = dep.reference || String(dep.id);
    if (page.some(other => other.reference === `CANCEL-${reference}` && depositTotal(other) <= 0)) {
        return false;
    }
    if (role.isAdmin) {
        return true;
    }
    const day = new Date(`${(dep.captureDate || dep.date).slice(0, 10)}T00:00:00`);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.floor((now.getTime() - day.getTime()) / 86_400_000);
    return diffDays <= 3;
}
