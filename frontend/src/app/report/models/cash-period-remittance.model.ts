import { Expense } from '../../expense/models/expense.model';

export type RemittanceStatus = 'PENDING' | 'RECEIVED';
export type RemittanceInitiator = 'SECRETARY' | 'MANAGER';

export interface CashPeriodRemittanceSummary {
    year: number;
    month: number;
    totalAmount: number;
    creditAmount: number;
    tontineAmount: number;
    newBalanceAmount: number;
    expenseAmount: number;
    netAmount: number;
    status: RemittanceStatus | null;
    remittanceId: number | null;
    canSubmit: boolean;
    canAcknowledge: boolean;
    canInitiate: boolean;
    candidateExpenses: Expense[];
    linkedExpenses: Expense[];
}

export interface CashPeriodRemittance {
    id: number;
    year: number;
    month: number;
    totalAmount: number;
    creditAmount: number;
    tontineAmount: number;
    newBalanceAmount: number;
    expenseAmount: number;
    netAmount: number;
    status: RemittanceStatus;
    initiatedBy: RemittanceInitiator;
    submittedBy?: string;
    receivedBy?: string;
    submittedAt?: string;
    receivedAt?: string;
    reference: string;
}
