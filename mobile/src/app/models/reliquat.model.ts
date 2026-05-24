export interface ClientReliquat {
  id: string;
  clientId: string;
  commercialId: string;
  totalAmount: number;           // Reliquat accumulé non consommé
  lastRecoveryId?: string;
  createdAt: string;
  updatedAt: string;
  lastAccountedDate?: string;    // Pour anti-double comptage
  isSync: boolean;
  syncDate?: string;
}

export interface RecoveryPlan {
  misesCount: number;            // Nombre de mises couvertes
  amountCovered: number;         // Montant total couvert (mises × stake)
  reliquatUsed: number;          // Reliquat existant consommé
  reliquatGenerated: number;     // Nouveau reliquat généré
  cashNeeded: number;            // Montant en espèces que le client doit verser
}
