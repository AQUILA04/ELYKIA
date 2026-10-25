export const MISE_DAY_STEP = 31;

export interface DayFit {
  exact: boolean;
  /** Nombre de jours couverts. 0 est valide lorsque le carnet ne contient que l'avance. */
  days: number;
  maxDays: number;
}

export function extendedMaxDays(days: number, current = MISE_DAY_STEP): number {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const needed = Math.max(MISE_DAY_STEP, safeDays);
  const blocks = Math.ceil(needed / MISE_DAY_STEP);
  const grown = blocks * MISE_DAY_STEP;
  const base = Number.isFinite(current) ? current : MISE_DAY_STEP;
  return Math.max(base, grown);
}

/**
 * Retrouve le nombre de jours lorsque carnet = jours × mise + avance.
 * La correspondance est exacte seulement si le reste est nul.
 */
export function fitNotebookDays(notebook: number, advance: number, dailyMise: number): DayFit {
  const empty: DayFit = { exact: false, days: 0, maxDays: MISE_DAY_STEP };
  if (!(dailyMise > 0) || !Number.isFinite(notebook) || !Number.isFinite(advance)) {
    return empty;
  }
  const mises = notebook - advance;
  if (mises < -0.0001) {
    return empty;
  }
  const raw = mises / dailyMise;
  const days = Math.round(raw);
  const exact = days >= 0 && Math.abs(raw - days) < 0.0001;
  if (!exact) {
    return empty;
  }
  return { exact: true, days, maxDays: extendedMaxDays(days) };
}

export function misesTotal(days: number | null, dailyMise: number): number {
  if (days == null || days <= 0 || !(dailyMise > 0)) {
    return 0;
  }
  return days * dailyMise;
}
