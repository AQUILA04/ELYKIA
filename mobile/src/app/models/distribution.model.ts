import { Article } from "./article.model";
import { Client } from "./client.model";
import { DistributionItem } from './distribution-item.model';

export interface Distribution {
  id: string;
  reference: string;
  creditId?: string; // RENDU OPTIONNEL pour la migration
  totalAmount: number;
  paidAmount?: number;
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
  items?: DistributionItem[];
}
