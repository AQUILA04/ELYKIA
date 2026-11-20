/** Total d'un type d'opération sur la période (GET api/daily-operations/totals). */
export interface OperationTypeTotal {
    type: string;
    count: number;
    amount: number;
}

/** Famille d'une opération : couleur du badge dans le journal (teintes distinctes aussi en clarté). */
export type OperationTone = 'credit' | 'tontine' | 'cash' | 'stock' | 'client' | 'cancel';

interface OperationTypeInfo {
    label: string;
    tone: OperationTone;
}

const TYPES: Record<string, OperationTypeInfo> = {
    CREDIT_COLLECTION: { label: 'Recouvrement', tone: 'credit' },
    CREDIT_COLLECTION_CANCEL: { label: 'Recouvrement annulé', tone: 'cancel' },
    CREDIT_SALES: { label: 'Vente à crédit', tone: 'credit' },
    CREDIT_SALE_CANCEL: { label: 'Vente annulée', tone: 'cancel' },
    CREDIT: { label: 'Crédit', tone: 'credit' },
    ORDER: { label: 'Commande', tone: 'credit' },
    TONTINE_COLLECTION: { label: 'Collecte tontine', tone: 'tontine' },
    TONTINE_COLLECTION_CANCEL: { label: 'Collecte annulée', tone: 'cancel' },
    TONTINE_DELIVERY: { label: 'Livraison tontine', tone: 'tontine' },
    TONTINE_MEMBER_ENROLLMENT: { label: 'Adhésion tontine', tone: 'tontine' },
    TONTINE: { label: 'Tontine', tone: 'tontine' },
    CASH_DEPOSIT: { label: 'Versement', tone: 'cash' },
    CASH_DEPOSIT_CANCEL: { label: 'Versement annulé', tone: 'cancel' },
    CASH: { label: 'Caisse', tone: 'cash' },
    SURPLUS_REALLOCATION: { label: 'Équilibrage surplus', tone: 'cash' },
    NEW_ACCOUNT: { label: 'Nouveau compte', tone: 'client' },
    NEW_CLIENT: { label: 'Nouveau client', tone: 'client' },
    ADHESION_PERSONAL: { label: 'Adhésion personnelle', tone: 'client' },
    ADHESION_BUSINESS: { label: 'Adhésion business', tone: 'client' },
    ADHESION_EVENT: { label: 'Adhésion événement', tone: 'client' },
    ADHESION_TOP_UP: { label: 'Recharge d\'adhésion', tone: 'client' },
    STOCK_REQUEST: { label: 'Sortie stock', tone: 'stock' },
    STOCK_RETURN: { label: 'Retour stock', tone: 'stock' },
    STOCK_TONTINE_REQUEST: { label: 'Sortie stock tontine', tone: 'stock' },
    STOCK_TONTINE_RETURN: { label: 'Retour stock tontine', tone: 'stock' }
};

export function operationLabel(type: string | null | undefined): string {
    if (!type) {
        return '';
    }
    return TYPES[type]?.label ?? type;
}

export function operationTone(type: string | null | undefined): OperationTone {
    return (type && TYPES[type]?.tone) || 'stock';
}
