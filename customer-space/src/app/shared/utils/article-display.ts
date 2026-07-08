import { CustomerArticle } from '../models/customer.model';

/** Libellé catalogue : commercialName + name (aligné back-office). */
export function articleDisplayName(article: Pick<CustomerArticle, 'displayName' | 'commercialName' | 'name'>): string {
  if (article.displayName?.trim()) {
    return article.displayName.trim();
  }
  const commercial = article.commercialName?.trim() ?? '';
  const name = article.name?.trim() ?? '';
  if (!commercial) return name;
  if (!name || commercial.toLowerCase() === name.toLowerCase()) return commercial;
  return `${commercial} ${name}`;
}
