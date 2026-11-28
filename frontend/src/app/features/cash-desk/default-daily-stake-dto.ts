export interface DefaultDailyStakeDto{
    clientIds: number [];
    collector: string | null;
    creditIds: number [];
}


export interface SpecialDailyStakeDto {
    stakeUnits: { clientId: number, amount: number, creditId: number }[];
    collector: string;
  }

export interface UnifiedRecoveryUnitDto {
  creditId: number;
  clientId?: number;
  amount: number;
  recoveryId: string;
  reliquatGeneratedAmount?: number;
  reliquatUsedAmount?: number;
  operationConsentCode?: string | null;
  confirmedAmount?: number | null;
}

export interface UnifiedRecoveryBatchDto {
  collector: string;
  syncConsentCode?: string | null;
  source?: 'MOBILE_SYNC' | 'WEB_TFJ_BATCH';
  recoveries: UnifiedRecoveryUnitDto[];
}

  export interface TicketingDto {
    collector: string;
    totalAmount: number;
    ticketingJson: string;
  }
  