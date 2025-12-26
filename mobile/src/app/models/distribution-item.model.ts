export interface DistributionItem {
  id: string;
  distributionId: string;
  articleId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  articleName?: string;
}
