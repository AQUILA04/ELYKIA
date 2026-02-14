/**
 * Modèle pour le résumé des données d'un commercial
 * Utilisé pour vérifier la complétude de l'initialisation
 */
export interface DataSummary {
  commercialUsername: string;
  generatedAt: string;
  totalClients: number;
  totalDistributions: number;
  totalRecoveries: number;
  totalTontineMembers: number;
  totalTontineCollections: number;
  totalTontineDeliveries: number;
  totalArticles: number;
  totalLocalities: number;
  totalStockOutputs: number;
  totalAccounts: number;
  totalTontineStockItems: number;
  totalTontineStockAvailable: number;
  totalCommercialStockItems: number;
  totalCommercialStockRemaining: number;
}

/**
 * Résultat de la comparaison des totaux serveur vs mobile
 */
export interface DataComparisonResult {
  isComplete: boolean;
  missingData: string[];
  serverSummary: DataSummary;
  localCounts: {
    clients: number;
    distributions: number;
    recoveries: number;
    tontineMembers: number;
    tontineCollections: number;
    tontineDeliveries: number;
    articles: number;
    localities: number;
    tontineStockItems: number;
    tontineStockAvailable: number;
    commercialStockItems: number;
    commercialStockRemaining: number;
  };
}
