export interface FormerTontineMemberRow {
  memberId: number;
  sessionYear: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  ownTotal: number;
}

export interface FormerTontineCollectionRow {
  memberId: number;
  id: number;
  amount: number;
  collectionDate: string;
  reference: string;
}

export interface FormerCreditRow {
  creditId: number;
  reference: string;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  handoverDate: string | null;
  totalAmountAtHandover: number | null;
  totalRemainingAtHandover: number | null;
  ownRecoveriesTotal: number;
}

export interface FormerCreditTimelineRow {
  creditId: number;
  id: number;
  amount: number;
  operationDate: string;
  reference: string;
}

export interface FormerAgencySaleRow {
  creditId: number;
  clientId: number;
  reference: string;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  saleDate: string;
  totalAmount: number;
}

export interface FormerPortfolioSyncPayload {
  tontineMembers: Array<FormerTontineMemberRow & { ownCollectionsTotal?: number }>;
  tontineCollections: FormerTontineCollectionRow[];
  credits: FormerCreditRow[];
  creditTimelines: FormerCreditTimelineRow[];
  agencySales: FormerAgencySaleRow[];
}
