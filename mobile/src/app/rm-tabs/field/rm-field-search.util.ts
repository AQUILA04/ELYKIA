export interface RmFieldGroup<T> {
  commercial: string;
  quarters: { quarter: string; items: T[] }[];
}

/** Accent-insensitive fold used by the Terrain list search. */
export function normalizeRmSearch(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filters grouped Terrain rows from the local pack.
 * Matching is done in memory, so it works online and offline.
 */
export function filterRmFieldGroups<T>(
  groups: RmFieldGroup<T>[],
  query: string,
  itemText: (item: T) => string
): RmFieldGroup<T>[] {
  const q = normalizeRmSearch(query);
  if (!q) {
    return groups;
  }
  const digits = q.replace(/\D/g, '');
  return groups
    .map(group => ({
      commercial: group.commercial,
      quarters: group.quarters
        .map(quarter => ({
          quarter: quarter.quarter,
          items: quarter.items.filter(item =>
            matchesRmSearch(q, digits, `${itemText(item)} ${group.commercial} ${quarter.quarter}`)
          )
        }))
        .filter(quarter => quarter.items.length > 0)
    }))
    .filter(group => group.quarters.length > 0);
}

function matchesRmSearch(query: string, digits: string, raw: string): boolean {
  const text = normalizeRmSearch(raw);
  if (text.includes(query)) {
    return true;
  }
  if (digits.length >= 3) {
    return text.replace(/\D/g, '').includes(digits);
  }
  return false;
}
