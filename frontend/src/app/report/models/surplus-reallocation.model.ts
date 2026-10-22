export interface SurplusReallocationDay {
    date: string;
    creditGap: number;
    tontineGap: number;
    newBalanceGap: number;
    creditAllocated: number;
    tontineAllocated: number;
    newBalanceAllocated: number;
    priority: boolean;
    beforePeriod: boolean;
}

export interface SurplusReallocationSource {
    date: string;
    surplus: number;
}

export interface SurplusReallocationOptions {
    includeNewBalance: boolean;
    priorityDates: string[];
}

export interface SurplusReallocationLine {
    cashDepositId?: number;
    depositReference?: string;
    depositDate: string;
    targetDate?: string;
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
    days?: SurplusReallocationDay[];
    surplusByDay?: SurplusReallocationSource[];
}
