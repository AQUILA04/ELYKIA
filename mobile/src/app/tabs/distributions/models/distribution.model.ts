
export interface Distribution {
  id: string;
  date: string;
  client: string;
  clientId: number;
  articles: Article[];
  totalAmount: number;
  status: 'active' | 'completed' | 'overdue';
  paymentProgress: number;
  dailyPayment: number;
}

export interface Article {
  name: string;
  quantity: number;
  price: number;
}
