export interface TontineSession {
    id: string;
    year: number;
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'CLOSED' | 'PENDING';
    memberCount: number;
    totalCollected: number;
    isSync: boolean;
    syncDate?: string;
    syncHash?: string;
}

export interface TontineMember {
    id: string;
    tontineSessionId: string;
    clientId: string;
    commercialUsername: string;
    totalContribution: number;
    deliveryStatus: 'PENDING' | 'VALIDATED' | 'DELIVERED';
    registrationDate: string;
    isLocal: boolean;
    isSync: boolean;
    syncDate?: string;
    syncHash?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    amount?: number;
    notes?: string;
}

export interface TontineMemberView extends TontineMember {
    clientName: string;
    clientPhone: string;
    clientQuarter?: string;
    hasPaidToday?: boolean;
}

export interface TontineCollection {
    id: string;
    tontineMemberId: string;
    amount: number;
    collectionDate: string;
    commercialUsername?: string;
    isLocal: boolean;
    isSync: boolean;
    syncDate?: string;
    syncHash?: string;
    isDeliveryCollection?: boolean;
    clientName?: string;
}

export interface TontineDeliveryItem {
    id: string;
    tontineDeliveryId: string;
    articleId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    articleName?: string; // Populated via JOIN with articles table
}

export interface TontineDelivery {
    id: string;
    tontineMemberId: string;
    commercialUsername: string;
    requestDate: string;
    deliveryDate?: string;
    totalAmount: number;
    status: 'PENDING' | 'VALIDATED' | 'DELIVERED' | 'CANCELLED';
    items?: TontineDeliveryItem[];
    isLocal: boolean;
    isSync: boolean;
    syncDate?: string;
    syncHash?: string;
}

export interface TontineStock {
    id: string;
    commercial: string;
    creditId?: string;
    articleId: string;
    articleName?: string;
    unitPrice: number;
    totalQuantity: number;
    availableQuantity: number;
    distributedQuantity: number;
    year: number;
    tontineSessionId: string;
}
