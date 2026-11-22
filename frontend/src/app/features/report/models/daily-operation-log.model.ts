export interface DailyOperationLog {
    id: number;
    timestamp: string;
    commercialUsername: string;
    type: string;
    amount: number;
    reference: string;
    description: string;
    date: string;
}
