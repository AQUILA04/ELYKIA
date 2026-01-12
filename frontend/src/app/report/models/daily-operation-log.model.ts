export interface DailyOperationLog {
    id: number;
    timestamp: string;
    commercialUsername: string;
    operationType: string;
    amount: number;
    subject: string;
    description: string;
    date: string;
}
