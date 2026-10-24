import { RmFieldGroup } from './rm-field-search.util';
import {
  classifyRmFieldProgress,
  filterRmFieldGroupsByProgress,
  matchesRmFieldProgress,
  RmFieldControlSnapshot,
  toRmFieldListProgress
} from './rm-field-progress.util';

const NOW = new Date('2026-10-24T12:00:00');

describe('rm field progress', () => {
  it('maps the segment to the API value', () => {
    expect(toRmFieldListProgress('all')).toBe('ALL');
    expect(toRmFieldListProgress('todo')).toBe('TODO');
    expect(toRmFieldListProgress('done')).toBe('DONE');
  });

  it('keeps never-controlled rows only in À faire and Tous', () => {
    expect(classifyRmFieldProgress(null, NOW)).toBe('todo');
    expect(classifyRmFieldProgress({}, NOW)).toBe('todo');
    expect(matchesRmFieldProgress('todo', null, NOW)).toBeTrue();
    expect(matchesRmFieldProgress('done', null, NOW)).toBeFalse();
    expect(matchesRmFieldProgress('all', null, NOW)).toBeTrue();
  });

  it('keeps a control closed within 30 days in Déjà fait', () => {
    const recent: RmFieldControlSnapshot = {
      status: 'CONFORME',
      observedAt: '2026-10-01T08:00:00',
      ecartDecisionStatus: null,
      modifiable: false
    };
    expect(classifyRmFieldProgress(recent, NOW)).toBe('done');
    expect(matchesRmFieldProgress('todo', recent, NOW)).toBeFalse();
  });

  it('includes the control recorded exactly 30 days ago', () => {
    const boundary: RmFieldControlSnapshot = {
      status: 'CONFORME',
      observedAt: '2026-09-24T12:00:00'
    };
    expect(classifyRmFieldProgress(boundary, NOW)).toBe('done');
  });

  it('leaves a closed control older than 30 days in Tous only', () => {
    const archived: RmFieldControlSnapshot = {
      status: 'ECART',
      observedAt: '2026-09-24T11:59:59',
      ecartDecisionStatus: 'ACCEPTED',
      modifiable: false
    };
    expect(classifyRmFieldProgress(archived, NOW)).toBe('allOnly');
    expect(matchesRmFieldProgress('all', archived, NOW)).toBeTrue();
    expect(matchesRmFieldProgress('todo', archived, NOW)).toBeFalse();
    expect(matchesRmFieldProgress('done', archived, NOW)).toBeFalse();
  });

  it('keeps an open gap in Déjà fait even when it is older than 30 days', () => {
    const pending: RmFieldControlSnapshot = {
      status: 'ECART',
      observedAt: '2026-01-02T08:00:00',
      ecartDecisionStatus: 'PENDING',
      modifiable: true
    };
    const modifiableOnly: RmFieldControlSnapshot = {
      status: 'ECART',
      observedAt: '2026-01-02T08:00:00',
      modifiable: true
    };
    expect(classifyRmFieldProgress(pending, NOW)).toBe('done');
    expect(classifyRmFieldProgress(modifiableOnly, NOW)).toBe('done');
    expect(matchesRmFieldProgress('todo', pending, NOW)).toBeFalse();
  });

  it('drops empty commercial blocks after the progress filter', () => {
    const groups: RmFieldGroup<{ id: number }>[] = [
      {
        commercial: 'Awa',
        quarters: [
          {
            quarter: 'Akpakpa',
            items: [{ id: 1 }, { id: 2 }]
          }
        ]
      }
    ];
    const snapshots = new Map<number, RmFieldControlSnapshot>([
      [1, {}],
      [2, { status: 'CONFORME', observedAt: '2026-01-01T00:00:00' }]
    ]);
    const todo = filterRmFieldGroupsByProgress(groups, 'todo', item => snapshots.get(item.id), NOW);
    expect(todo[0].quarters[0].items.map(item => item.id)).toEqual([1]);
    const done = filterRmFieldGroupsByProgress(groups, 'done', item => snapshots.get(item.id), NOW);
    expect(done).toEqual([]);
  });
});
