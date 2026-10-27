import { RmFieldGroup } from './rm-field-search.util';

export type RmFieldProgressFilter = 'all' | 'todo' | 'done';

export type RmFieldListProgress = 'ALL' | 'TODO' | 'DONE';

export interface RmFieldControlSnapshot {
  observedAt?: string | null;
  status?: string | null;
  ecartDecisionStatus?: string | null;
  modifiable?: boolean | null;
}

export type RmFieldProgressBucket = 'todo' | 'done';

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
 * À faire = jamais contrôlé.
 * Déjà fait = un contrôle existe déjà, quelle que soit sa date.
 */
export function classifyRmFieldProgress(
  snapshot: RmFieldControlSnapshot | null | undefined
): RmFieldProgressBucket {
  if (!hasRmFieldControl(snapshot)) {
    return 'todo';
  }
  return 'done';
}

export function matchesRmFieldProgress(
  filter: RmFieldProgressFilter,
  snapshot: RmFieldControlSnapshot | null | undefined
): boolean {
  if (filter === 'all') {
    return true;
  }
  const bucket = classifyRmFieldProgress(snapshot);
  if (filter === 'todo') {
    return bucket === 'todo';
  }
  return bucket === 'done';
}

export function filterRmFieldGroupsByProgress<T>(
  groups: RmFieldGroup<T>[],
  filter: RmFieldProgressFilter,
  snapshotOf: (item: T) => RmFieldControlSnapshot | null | undefined
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
          items: quarter.items.filter(item => matchesRmFieldProgress(filter, snapshotOf(item)))
        }))
        .filter(quarter => quarter.items.length > 0)
    }))
    .filter(group => group.quarters.length > 0);
}
