import { RmFieldGroup } from './rm-field-search.util';
import {
  classifyRmFieldProgress,
  filterRmFieldGroupsByProgress,
  matchesRmFieldProgress,
  RmFieldControlSnapshot,
  toRmFieldListProgress
} from './rm-field-progress.util';

describe('rm field progress', () => {
  it('maps the segment to the API value', () => {
    expect(toRmFieldListProgress('all')).toBe('ALL');
    expect(toRmFieldListProgress('todo')).toBe('TODO');
    expect(toRmFieldListProgress('done')).toBe('DONE');
  });

  it('keeps never-controlled rows only in À faire and Tous', () => {
    expect(classifyRmFieldProgress(null)).toBe('todo');
    expect(classifyRmFieldProgress({})).toBe('todo');
    expect(matchesRmFieldProgress('todo', null)).toBeTrue();
    expect(matchesRmFieldProgress('done', null)).toBeFalse();
    expect(matchesRmFieldProgress('all', null)).toBeTrue();
  });

  it('keeps a control from a previous day in Déjà fait', () => {
    const yesterday: RmFieldControlSnapshot = {
      status: 'CONFORME',
      observedAt: '2026-10-26T08:00:00',
      ecartDecisionStatus: null,
      modifiable: false
    };
    expect(classifyRmFieldProgress(yesterday)).toBe('done');
    expect(matchesRmFieldProgress('todo', yesterday)).toBeFalse();
    expect(matchesRmFieldProgress('done', yesterday)).toBeTrue();
  });

  it('keeps a closed control older than 30 days in Déjà fait', () => {
    const archived: RmFieldControlSnapshot = {
      status: 'ECART',
      observedAt: '2026-01-01T08:00:00',
      ecartDecisionStatus: 'ACCEPTED',
      modifiable: false
    };
    expect(classifyRmFieldProgress(archived)).toBe('done');
    expect(matchesRmFieldProgress('all', archived)).toBeTrue();
    expect(matchesRmFieldProgress('todo', archived)).toBeFalse();
    expect(matchesRmFieldProgress('done', archived)).toBeTrue();
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
      },
      {
        commercial: 'Koffi',
        quarters: [
          {
            quarter: 'Fidjrossè',
            items: [{ id: 3 }]
          }
        ]
      }
    ];
    const snapshots = new Map<number, RmFieldControlSnapshot>([
      [1, {}],
      [2, { status: 'CONFORME', observedAt: '2026-01-01T00:00:00' }],
      [3, { status: 'CONFORME', observedAt: '2025-06-01T00:00:00' }]
    ]);
    const todo = filterRmFieldGroupsByProgress(groups, 'todo', item => snapshots.get(item.id));
    expect(todo.map(group => group.commercial)).toEqual(['Awa']);
    expect(todo[0].quarters[0].items.map(item => item.id)).toEqual([1]);
    const done = filterRmFieldGroupsByProgress(groups, 'done', item => snapshots.get(item.id));
    expect(done[0].quarters[0].items.map(item => item.id)).toEqual([2]);
    expect(done[1].quarters[0].items.map(item => item.id)).toEqual([3]);
  });
});
