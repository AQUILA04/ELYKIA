import { RmFieldGroup } from './rm-field-search.util';

/** Fenêtre glissante des contrôles déjà clôturés encore listés dans « Déjà fait ». */
export const RM_FIELD_PROGRESS_WINDOW_DAYS = 30;

export type RmFieldProgressFilter = 'all' | 'todo' | 'done';

export type RmFieldListProgress = 'ALL' | 'TODO' | 'DONE';

export interface RmFieldControlSnapshot {
  observedAt?: string | null;
  status?: string | null;
  ecartDecisionStatus?: string | null;
  modifiable?: boolean | null;
}

export type RmFieldProgressBucket = 'todo' | 'done' | 'allOnly';

export function toRmFieldListProgress(filter: RmFieldProgressFilter): RmFieldListProgress {
  if (filter === 'todo') {
    return 'TODO';
  }
  if (filter === 'done') {
    return 'DONE';
  }
  return 'ALL';
}

/** Un dossier sans dernier contrôle n'a jamais été fait. */
export function hasRmFieldControl(snapshot: RmFieldControlSnapshot | null | undefined): boolean {
  if (!snapshot) {
    return false;
  }
  return !!(snapshot.status || snapshot.observedAt);
}

/**
 * Écart encore ouvert : décision en attente, ou écart encore modifiable.
 * Un contrôle conforme, accepté ou refusé n'est pas ouvert.
 */
export function isRmFieldOpenGap(snapshot: RmFieldControlSnapshot): boolean {
  if (snapshot.ecartDecisionStatus === 'PENDING') {
    return true;
  }
  return snapshot.status === 'ECART' && snapshot.modifiable === true;
}

/** observedAt >= maintenant − 30 jours calendaires. */
export function isRmFieldWithinWindow(observedAt: string | null | undefined, now: Date): boolean {
  if (!observedAt) {
    return false;
  }
  const time = Date.parse(observedAt);
  if (Number.isNaN(time)) {
    return false;
  }
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - RM_FIELD_PROGRESS_WINDOW_DAYS);
  return time >= cutoff.getTime();
}

export function classifyRmFieldProgress(
  snapshot: RmFieldControlSnapshot | null | undefined,
  now: Date = new Date()
): RmFieldProgressBucket {
  if (!hasRmFieldControl(snapshot)) {
    return 'todo';
  }
  const control = snapshot as RmFieldControlSnapshot;
  if (isRmFieldOpenGap(control) || isRmFieldWithinWindow(control.observedAt, now)) {
    return 'done';
  }
  return 'allOnly';
}

export function matchesRmFieldProgress(
  filter: RmFieldProgressFilter,
  snapshot: RmFieldControlSnapshot | null | undefined,
  now: Date = new Date()
): boolean {
  if (filter === 'all') {
    return true;
  }
  const bucket = classifyRmFieldProgress(snapshot, now);
  if (filter === 'todo') {
    return bucket === 'todo';
  }
  return bucket === 'done';
}

export function filterRmFieldGroupsByProgress<T>(
  groups: RmFieldGroup<T>[],
  filter: RmFieldProgressFilter,
  snapshotOf: (item: T) => RmFieldControlSnapshot | null | undefined,
  now: Date = new Date()
): RmFieldGroup<T>[] {
  if (filter === 'all') {
    return groups;
  }
  return groups
    .map(group => ({
      commercial: group.commercial,
      quarters: group.quarters
        .map(quarter => ({
          quarter: quarter.quarter,
          items: quarter.items.filter(item => matchesRmFieldProgress(filter, snapshotOf(item), now))
        }))
        .filter(quarter => quarter.items.length > 0)
    }))
    .filter(group => group.quarters.length > 0);
}
