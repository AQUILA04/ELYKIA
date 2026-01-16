export interface CreditDistributionDetail {
  creditParentId: number;
  parentReference: string;
  articleId: number;
  articleName: string;
  brand: string;
  model: string;
  parentQuantity: number;
  distributedQuantity: number;
  undistributedQuantity: number;
}

export interface CreditTimelineDto {
  creditId: number;
  amount: number;
  date?: string; // Optionnel, peut être géré par le backend
}
