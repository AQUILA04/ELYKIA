import { Article } from "./article.model";
import { Client } from "./client.model";
import { OrderItem } from './order-item.model';

export interface Order {
  id: string;
  reference: string;
  totalAmount: number;
  advance?: number;
  remainingAmount?: number;
  dailyPayment: number;
  startDate: string;
  endDate: string;
  status: string;
  clientId: string;
  commercialId: string;
  isLocal: boolean;
  isSync: boolean;
  syncDate: string;
  createdAt: string;
  client?: Client;
  articles?: Article[];
  syncHash?: string;
  articleCount?: number;
  items?: OrderItem[];
}
