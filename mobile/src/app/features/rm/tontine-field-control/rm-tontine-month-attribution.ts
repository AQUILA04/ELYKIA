/**
 * Règles d'attribution des mois au contrôle carnet tontine.
 *
 * Un mois déjà cotisé par un commercial reste sur son bloc (montants système > 0).
 * Un mois encore à zéro peut recevoir un commercial + une mise, mais une seule fois :
 * s'il a déjà des cotisations ailleurs, le stub à 0 des autres blocs ne doit pas
 * apparaître comme un mois « vide grisé » — il est omis (voir omitClaimedEmptyMonthRows).
 *
 * Sur un mois déjà cotisé (systemAmount > 0), le chef peut ajouter jusqu'à
 * {@link MAX_EXTRA_CARNET_ROWS} lignes « carnet seul » (autre commercial, mise figée,
 * système 0) via le bouton +, pour coller au carnet physique multi-commerciaux.
 */

/** Original + jusqu'à 2 doublons carnet = 3 lignes max pour un mois calendaire. */
export const MAX_MONTH_CONTROL_ROWS = 3;

/** Doublons carnet autorisés sur un mois déjà cotisé dans le système. */
export const MAX_EXTRA_CARNET_ROWS = 2;

export interface AttributionMonthRow {
  year: number;
  month: number;
  systemAmount: number;
  /** Ligne ajoutée via + sur un mois déjà cotisé (carnet seul, système 0). */
  duplicatedFromSystemMonth?: boolean;
  commercialUsername?: string;
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
  if (amountOf(row) > 0 || row.duplicatedFromSystemMonth) {
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
 * Les doublons carnet d'un mois financé ne passent pas par ce chemin.
 */
export function canEditMonthAttribution(
  row: AttributionMonthRow,
  allRows: readonly AttributionMonthRow[]
): boolean {
  if (row.duplicatedFromSystemMonth) {
    return false;
  }
  return amountOf(row) <= 0 && !isMonthCollectedElsewhere(row, allRows);
}

/** Ligne carnet additionnelle (autre commercial, mise figée, système 0). */
export function isExtraCarnetAttribution(row: AttributionMonthRow): boolean {
  return row.duplicatedFromSystemMonth === true;
}

/** Nombre de lignes de contrôle pour un mois calendaire (tous blocs). */
export function countCalendarMonthRows(
  year: number,
  month: number,
  allRows: readonly AttributionMonthRow[]
): number {
  const y = Number(year);
  const m = Number(month);
  return allRows.filter(row => yearOf(row) === y && monthOf(row) === m).length;
}

/**
 * Bouton + : uniquement sur une ligne déjà cotisée (system > 0),
 * tant que le mois calendaire a moins de {@link MAX_MONTH_CONTROL_ROWS} lignes.
 */
export function canAddExtraCarnetRow(
  source: AttributionMonthRow,
  allRows: readonly AttributionMonthRow[]
): boolean {
  if (amountOf(source) <= 0 || source.duplicatedFromSystemMonth) {
    return false;
  }
  return countCalendarMonthRows(yearOf(source), monthOf(source), allRows) < MAX_MONTH_CONTROL_ROWS;
}

/** Usernames déjà utilisés sur le même mois calendaire (hors la ligne courante). */
export function commercialsUsedOnMonth(
  row: AttributionMonthRow,
  allRows: readonly AttributionMonthRow[]
): string[] {
  const year = yearOf(row);
  const month = monthOf(row);
  const used: string[] = [];
  for (const candidate of allRows) {
    if (candidate === row) {
      continue;
    }
    if (yearOf(candidate) !== year || monthOf(candidate) !== month) {
      continue;
    }
    const username = (candidate.commercialUsername || '').trim();
    if (username) {
      used.push(username);
    }
  }
  return used;
}

/**
 * Retire les mois à zéro déjà cotisés sous un autre commercial.
 * Évite l'affichage trompeur « Système : 0 » + grisé sur le mauvais bloc.
 * Les mois avec montant système, les doublons carnet et les mois vraiment vides sont conservés.
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
      if (amountOf(row) > 0 || row.duplicatedFromSystemMonth) {
        return true;
      }
      return !claimed.has(`${yearOf(row)}-${monthOf(row)}`);
    });
  }
}
