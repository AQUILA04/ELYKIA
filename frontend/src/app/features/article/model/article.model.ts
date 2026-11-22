export interface Article {
    id: number;
    code: string;
    name: string;
    commercialName: string;
    description?: string;
    sellingPrice: number;
    creditSalePrice?: number;
    stockQuantity: number;
    quantityRemaining?: number; // Added for stock logic
    // Add other fields as needed based on usage
}
