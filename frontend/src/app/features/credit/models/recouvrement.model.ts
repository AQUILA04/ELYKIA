export interface RecouvrementWebDto {
  id: number;
  reference: string;
  creditReference: string;
  clientName: string;
  commercial: string;
  amount: number;
  totalAmountRemaining: number;
  creationDate: string;
}

export interface RecouvrementKpiDto {
  totalMises: number;
  totalMontant: number;
}
