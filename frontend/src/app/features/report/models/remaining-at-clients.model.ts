export interface RemainingAtClientsCredit {
  id: number;
  reference: string;
  clientLastname: string;
  clientFirstname: string;
  beginDate: string;
  totalAmount: number;
  totalAmountRemaining: number;
}

export interface RemainingAtClientsPage {
  content: {
    content: RemainingAtClientsCredit[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    last: boolean;
    first: boolean;
    empty: boolean;
  };
  salesCount: number;
  totalRemainingAmount: number;
}
