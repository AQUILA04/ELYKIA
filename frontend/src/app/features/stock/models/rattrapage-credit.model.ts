// Modèle de données pour le rattrapage crédit vente

export interface RattrapageItemDto {
  stockItemId: number;
  articleId: number;
  quantity: number;
  unitPrice: number;
}

export interface RattrapageCreditDto {
  commercial: string;
  clientId: number;
  sourceStockId: number;
  beginDate: string;        // ISO date "YYYY-MM-DD"
  dailyStake: number;
  advance: number;
  note?: string;
  expectedEndDate?: string; // optionnel, recalculé côté backend
  items: RattrapageItemDto[];
}

export interface SelectedItem {
  stockItemId: number;
  articleId: number;
  articleName: string;
  quantityRemaining: number;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}
