import { Distribution } from './distribution.model';
import { Client } from './client.model';

export interface Recovery {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  distributionId: string;
  clientId: string;
  commercialId: string;
  isLocal: boolean;
  isSync: boolean;
  syncDate: string;
  createdAt: string;
  syncHash?: string;
  isDefaultStake?: boolean;
  reference?: string; // Référence du CreditTimeline (ID mobile si existe)
  distribution?: Distribution;
  client?: Client;
}