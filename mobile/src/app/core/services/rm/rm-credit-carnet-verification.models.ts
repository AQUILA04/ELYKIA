export interface RmCreditCarnetVerificationOp {
  localId: string;
  creditId: number;
  clientName?: string;
  reference?: string;
  verified: boolean;
  createdAt: string;
  isSync: boolean;
  lastError: string | null;
}
