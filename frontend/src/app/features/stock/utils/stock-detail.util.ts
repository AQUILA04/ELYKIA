export function coerceStockItems<T>(items: T[] | Record<string, T> | null | undefined): T[] {
  if (!items) {
    return [];
  }
  if (Array.isArray(items)) {
    return items;
  }
  return Object.values(items);
}

export function formatArticleLabel(article: {
  type?: string;
  marque?: string;
  model?: string;
  name?: string;
} | null | undefined): string {
  if (!article) {
    return '—';
  }

  const label = [article.marque, article.model, article.name].filter(Boolean).join(' ').trim();
  if (article.type && label) {
    return `${article.type}: ${label}`;
  }
  return article.type || label || '—';
}
