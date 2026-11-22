export interface DefaultDailyStakeDto{
    clientIds: number [];
    collector: string | null;
    creditIds: number [];
}


export interface SpecialDailyStakeDto {
    stakeUnits: { clientId: number, amount: number, creditId: number }[];
    collector: string;
  }

  export interface TicketingDto {
    collector: string;
    totalAmount: number;
    ticketingJson: string;
  }
  