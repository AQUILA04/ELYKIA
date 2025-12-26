export interface Article {
  id: string;
  creditSalePrice: number;
  name: string;
  marque: string;
  model: string;
  type: string;
  stockQuantity: number;
  commercialName: string;
  isSync?: boolean;
  lastUpdate?: string;
  syncHash?: string;
  reference?: string;
}
