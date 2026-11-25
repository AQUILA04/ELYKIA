export interface Article {
    id: number;
    code: string;
    name: string;
    commercialName: string;
    description?: string;
    sellingPrice: number;
    creditSalePrice?: number;
    stockQuantity: number;
    agencyId?: number;
    warehouseOnHandQuantity?: number;
    warehouseReservedQuantity?: number;
    warehouseAvailableQuantity?: number;
    warehouseShortageQuantity?: number;
    quantityRemaining?: number; // Added for stock logic
    // Add other fields as needed based on usage
}
