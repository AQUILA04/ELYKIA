export interface RmCloseOp {
  localId: string;
  reference: string;
  creditId: number;
  amount: number;
  isPartial: boolean;
  clientName?: string;
  creditReference?: string;
  commercialUsername?: string;
  clientReliquatApplied?: number;
  originalRemaining?: number;
  createdAt: string;
  isSync: boolean;
  lastError?: string | null;
}

export interface RmCloseRequest {
  creditId: number;
  amount: number;
  isPartial: boolean;
  clientName?: string;
  creditReference?: string;
  commercialUsername?: string;
  clientReliquatApplied?: number;
  originalRemaining?: number;
  forceOffline?: boolean;
}

export interface RmCloseResult {
  op: RmCloseOp;
  mode: 'online' | 'offline';
}

export interface CloseCreditsApiItem {
  creditId: number;
  amount: number;
  isPartial: boolean;
  reference: string;
}

export interface CloseCreditsApiResponse {
  successes?: Array<{
    creditId: number;
    creditReference?: string;
    clientName?: string;
    errorMessage?: string;
  }>;
  failures?: Array<{
    creditId: number;
    creditReference?: string;
    errorMessage?: string;
  }>;
}
