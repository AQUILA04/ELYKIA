/**
 * Snapshot du stock commercial pris à chaque initialisation (serveur → local).
 *
 * Objectif : détecter si un commercial effectue plus de ventes locales que le stock
 * qu'il a reçu du serveur, ce qui arrive quand des distributions locales non synchronisées
 * coexistent avec un stock serveur rechargé (qui ne tient pas compte des ventes non encore
 * validées côté serveur).
 *
 * Logique de contrôle lors d'une nouvelle distribution :
 *   stockAtInit >= localSalesTotal + quantitéNouvelleVente
 *
 * La table est réinitialisée à chaque appel de initializeCommercialStock()
 * (c'est-à-dire à chaque initialisation depuis le serveur).
 */
export interface StockSnapshot {
  /** Identifiant unique (clé primaire auto-incrémentée) */
  id?: number;
  /** Nom d'utilisateur du commercial */
  commercialUsername: string;
  /** Quantité totale de stock reçue du serveur lors de la dernière initialisation */
  stockAtInit: number;
  /** Cumul des quantités vendues localement depuis la dernière initialisation */
  localSalesTotal: number;
  /** Date/heure de la dernière initialisation (ISO string) */
  initDate: string;
  /** Date/heure de la dernière mise à jour du cumul des ventes locales (ISO string) */
  updatedAt: string;
}
