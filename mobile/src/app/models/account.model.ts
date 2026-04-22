export interface Account {
  id: string;
  accountNumber: string;
  accountBalance: number;
  old_balance?: number;
  updated?: boolean;
  status: string;
  clientId: string;
  commercialUsername?: string;
  isLocal: boolean;
  isSync: boolean;
  createdAt: string;
  syncDate: string;
  syncHash?: string;
}