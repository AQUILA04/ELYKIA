export interface Article {
  id: string;
  creditSalePrice: number;
  /** Prix catalogue (aligné admin / commande tontine). */
  sellingPrice?: number;
  name: string;
  marque: string;
  model: string;
  type: string;
  stockQuantity: number;
  /** Stock du magasin lu sur le serveur (catalogue) ; null tant qu'il n'a jamais été lu. */
  warehouseStock?: number | null;
  /** Heure (ISO) de la dernière lecture du stock magasin. */
  warehouseStockAt?: string | null;
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
