export interface Article {
  id: string;
  creditSalePrice: number;
  name: string;
  marque: string;
  model: string;
  type: string;
  stockQuantity: number;
  commercialName: string;
  /** Backend State: ENABLED | DISABLED | DELETED — used to filter Catalogue */
  state?: string;
  /** Alias sometimes returned by API DTO alongside state */
  status?: string;
  isSync?: boolean;
  lastUpdate?: string;
  syncHash?: string;
  reference?: string;
}
