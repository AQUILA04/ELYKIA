/**
 * Règles d'attribution des mois vides au contrôle carnet tontine.
 *
 * Un mois déjà cotisé par un commercial reste sur son bloc (montants système > 0).
 * Un mois encore à zéro peut recevoir un commercial + une mise, mais une seule fois :
 * s'il a déjà des cotisations ailleurs, le stub à 0 des autres blocs ne doit pas
 * apparaître comme un mois « vide grisé » — il est omis (voir omitClaimedEmptyMonthRows).
 */

export interface AttributionMonthRow {
  year: number;
  month: number;
  systemAmount: number;
}

function yearOf(row: AttributionMonthRow): number {
  return Number(row.year);
}

function monthOf(row: AttributionMonthRow): number {
  return Number(row.month);
}

function amountOf(row: AttributionMonthRow): number {
  const value = Number(row.systemAmount);
  return Number.isFinite(value) ? value : 0;
}

/** Vrai si un autre bloc a déjà des cotisations pour le même mois calendaire. */
export function isMonthCollectedElsewhere(
  row: AttributionMonthRow,
  allRows: readonly AttributionMonthRow[]
): boolean {
  if (amountOf(row) > 0) {
    return false;
  }
  const year = yearOf(row);
  const month = monthOf(row);
  return allRows.some(candidate =>
    candidate !== row
    && yearOf(candidate) === year
    && monthOf(candidate) === month
    && amountOf(candidate) > 0);
}

/**
 * Mois encore à zéro et non revendiqué ailleurs : le chef peut choisir
 * le commercial et corriger la mise lue sur le carnet.
 */
export function canEditMonthAttribution(
  row: AttributionMonthRow,
  allRows: readonly AttributionMonthRow[]
): boolean {
  return amountOf(row) <= 0 && !isMonthCollectedElsewhere(row, allRows);
}

/**
 * Retire les mois à zéro déjà cotisés sous un autre commercial.
 * Évite l'affichage trompeur « Système : 0 » + grisé sur le mauvais bloc.
 * Les mois avec montant système et les mois vraiment vides sont conservés.
 */
export function omitClaimedEmptyMonthRows<T extends AttributionMonthRow>(
  blocks: ReadonlyArray<{ rows: T[] }>
): void {
  const claimed = new Set<string>();
  for (const block of blocks) {
    for (const row of block.rows) {
      if (amountOf(row) > 0) {
        claimed.add(`${yearOf(row)}-${monthOf(row)}`);
      }
    }
  }
  for (const block of blocks) {
    block.rows = block.rows.filter(row => {
      if (amountOf(row) > 0) {
        return true;
      }
      return !claimed.has(`${yearOf(row)}-${monthOf(row)}`);
    });
  }
}
