export interface RmCarnetVerificationOp {
  localId: string;
  tontineMemberId: number;
  clientName?: string;
  verified: boolean;
  createdAt: string;
  isSync: boolean;
  lastError: string | null;
}
