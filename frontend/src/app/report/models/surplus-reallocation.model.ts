export interface SurplusReallocationLine {
    cashDepositId?: number;
    depositReference?: string;
    depositDate: string;
    surplusTaken: number;
    creditAllocated: number;
    tontineAllocated: number;
    newBalanceAllocated: number;
}

export interface SurplusReallocation {
    id: number;
    commercialUsername: string;
    periodStart: string;
    periodEnd: string;
    performedAt: string;
    performedBy: string;
    surplusBefore: number;
    creditAllocated: number;
    tontineAllocated: number;
    newBalanceAllocated: number;
    surplusRemaining: number;
    remainingBefore: number;
    remainingAfter: number;
    totalReallocated: number;
    lines?: SurplusReallocationLine[];
}
