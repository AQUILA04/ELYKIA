export interface Transaction {
    id: string;
    clientId: string;
    referenceId: string;
    type: 'DISTRIBUTION' | 'PAYMENT';
    amount: number;
    details: string;
    date: string;
    isSync: boolean;
    isLocal: boolean;
}
