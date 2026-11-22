export interface TontineCollectionWebDto {
  id: number;
  reference: string;
  clientName: string;
  commercialUsername: string;
  amount: number;
  collectionDate: string;
}

export interface TontineCollectionKpiDto {
  totalMises: number;
  totalMontant: number;
}
