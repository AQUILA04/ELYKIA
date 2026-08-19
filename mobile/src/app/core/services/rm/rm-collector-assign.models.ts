export interface RmCollectorOption {
  username: string;
  firstname?: string;
  lastname?: string;
  displayName: string;
}

export interface RmCollectorAssignOp {
  localId: string;
  clientIds: number[];
  collector?: string;
  tontineCollector?: string;
  transferInProgressCredits: boolean;
  createdAt: string;
  isSync: boolean;
  lastError?: string | null;
}

export interface RmCollectorAssignRequest {
  clientIds: number[];
  collector?: string;
  tontineCollector?: string;
  transferInProgressCredits?: boolean;
  forceOffline?: boolean;
}

export interface RmCollectorAssignResult {
  op: RmCollectorAssignOp;
  mode: 'online' | 'offline';
}
