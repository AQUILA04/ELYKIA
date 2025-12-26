import { Distribution } from './distribution.model';
import { Client } from './client.model';
import { Article } from './article.model';
import { DistributionItem } from './distribution-item.model';

/**
 * Représente un article de distribution avec l'objet Article complet imbriqué.
 * Hérite de toutes les propriétés de DistributionItem (comme quantity, totalAmount).
 */
export interface DistributionItemView extends DistributionItem {
  article: Article; // Imbrication de l'objet Article complet
}

/**
 * Représente un objet Distribution complet prêt pour l'affichage,
 * avec les entités liées (Client, Articles) imbriquées.
 */
export interface DistributionView extends Omit<Distribution, 'items' | 'clientId'> {
  clientId: string;
  client: Client; // Imbrication de l'objet Client complet
  items: DistributionItemView[];
}
