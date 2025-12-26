import { StockOutputItem } from './stock-ouput-item';

export interface StockOutput {
  id: string;
  reference: string;
  status: string;
  updatable: boolean;
  totalAmount: number;
  createdAt: string;
  commercialId: string;
  isSync: boolean;
  syncDate?: string;
  syncHash?: string;
  items?: StockOutputItem[];
}
