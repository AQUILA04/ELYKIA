import { Order } from './order.model';

export interface OrderView extends Order {
    // Client details explicitly flattened for View
    clientName: string;
    clientQuarter?: string; // Important for filtering
    clientPhone?: string;

    // Additional calculated fields if needed for list view
    articleCount?: number;

    // Sync flags (already in Order but explicit here for View context)
    isLocal: boolean;
    isSync: boolean;
}
