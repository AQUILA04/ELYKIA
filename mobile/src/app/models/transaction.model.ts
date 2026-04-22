export interface Transaction {
    id: string;
    clientId: string;
    referenceId: string;
    type: 'DISTRIBUTION' | 'PAYMENT';
    amount: number;
    details: string;
    date: string;
    commercialUsername?: string;
    isSync: boolean;
    isLocal: boolean;
}
