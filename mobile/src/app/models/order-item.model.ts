export interface OrderItem {
  id: string;
  orderId: string;
  articleId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  articleName?: string;
}