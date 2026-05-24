/** Réponse paginée Spring Data (GET /api/stock-requests, etc.). */
export interface StockPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}
