export const KpiFinancierPermissions = {
  Vente: 'ROLE_KPI_FINANCIER_VENTE',
  Retard: 'ROLE_KPI_FINANCIER_RETARD',
  Echeance: 'ROLE_KPI_FINANCIER_ECHEANCE',
  Dashboard: 'ROLE_KPI_FINANCIER_DASHBOARD',
  RapportJournalier: 'ROLE_KPI_FINANCIER_RAPPORT_JOURNALIER',
  Tontine: 'ROLE_KPI_FINANCIER_TONTINE',
  TontineCollecte: 'ROLE_KPI_FINANCIER_TONTINE_COLLECTE',
  TontineLivraison: 'ROLE_KPI_FINANCIER_TONTINE_LIVRAISON',
  TransfertVente: 'ROLE_KPI_FINANCIER_TRANSFERT_VENTE',
  BiDashboard: 'ROLE_KPI_FINANCIER_BI_DASHBOARD',
  BiVentes: 'ROLE_KPI_FINANCIER_BI_VENTES',
  BiRecouvrement: 'ROLE_KPI_FINANCIER_BI_RECOUVREMENT',
  BiStock: 'ROLE_KPI_FINANCIER_BI_STOCK',
  Depense: 'ROLE_KPI_FINANCIER_DEPENSE',
} as const;

export type KpiFinancierPermission =
  (typeof KpiFinancierPermissions)[keyof typeof KpiFinancierPermissions];
