/** Part société saisie (montant de l'année et note d'observation facultative). */
export interface SocietyShareInput {
  amount: number;
  comment: string | null;
}

/** Total cotisé hors collectes de livraison (base de la part société). */
export function regularContributionOf(collections: Array<{ amount?: number; isDeliveryCollection?: boolean }>): number {
  return collections
    .filter(collection => !collection.isDeliveryCollection)
    .reduce((sum, collection) => sum + (collection.amount || 0), 0);
}
