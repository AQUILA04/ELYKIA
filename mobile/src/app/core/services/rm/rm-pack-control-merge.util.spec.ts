import { RmFieldControlOp } from './rm-field-control.models';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';
import { RmOfflinePack } from './rm.models';
import { mergePendingControlsIntoPack } from './rm-pack-control-merge.util';

describe('mergePendingControlsIntoPack', () => {
  const pack: RmOfflinePack = {
    planId: 1,
    planDate: '2026-10-27',
    generatedAt: '2026-10-27T04:00:00Z',
    stats: { lateCredits: 0, clients: 1, tontineMembers: 0, estimatedBytes: 0 },
    commercials: [],
    lateCredits: [],
    clients: [],
    creditFieldControlsToday: [
      { creditId: 8, status: 'CONFORME', observedAt: '2026-10-01T08:00:00Z' }
    ],
    tontineMembers: [],
    tontineFieldControlsToday: []
  };

  it('keeps a server control from a previous day and adds a pending one', () => {
    const pending: RmFieldControlOp = {
      localId: 'local-1',
      reference: 'CFC-PENDING',
      creditId: 9,
      notebookTotalAmount: 500,
      systemTotalAmountPaid: 400,
      differenceAmount: 100,
      status: 'ECART',
      observedAt: '2026-10-26T18:00:00Z',
      createdAt: '2026-10-26T18:00:00Z',
      isSync: false
    };

    const next = mergePendingControlsIntoPack(pack, [pending], []);
    const credits = next.creditFieldControlsToday as Array<{ creditId: number; status: string }>;

    expect(credits.map(row => row.creditId)).toEqual([9, 8]);
    expect(credits[0].status).toBe('ECART');
    expect(credits[1].status).toBe('CONFORME');
  });

  it('replaces the downloaded control when the same credit is still pending', () => {
    const pending: RmFieldControlOp = {
      localId: 'local-2',
      reference: 'CFC-NEWER',
      creditId: 8,
      notebookTotalAmount: 700,
      systemTotalAmountPaid: 700,
      differenceAmount: 0,
      status: 'CONFORME',
      observedAt: '2026-10-26T18:00:00Z',
      createdAt: '2026-10-26T18:00:00Z',
      isSync: false
    };
    const synced: RmFieldControlOp = { ...pending, creditId: 3, reference: 'CFC-SYNC', isSync: true };

    const next = mergePendingControlsIntoPack(pack, [synced, pending], []);
    const credits = next.creditFieldControlsToday as Array<{ creditId: number; reference?: string }>;

    expect(credits).toEqual([
      jasmine.objectContaining({ creditId: 8, reference: 'CFC-NEWER', observedAt: '2026-10-26T18:00:00Z' })
    ]);
  });

  it('adds a pending tontine control that is not yet on the server', () => {
    const pending: RmTontineFieldControlOp = {
      localId: 'local-t',
      reference: 'TFC-PENDING',
      tontineMemberId: 4,
      months: [],
      notebookTotalAmount: 200,
      systemTotalAmount: 200,
      differenceAmount: 0,
      status: 'CONFORME',
      observedAt: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
      isSync: false
    };

    const next = mergePendingControlsIntoPack(pack, [], [pending]);

    expect(next.tontineFieldControlsToday).toEqual([
      jasmine.objectContaining({ tontineMemberId: 4, status: 'CONFORME', observedAt: '2026-10-20T10:00:00Z' })
    ]);
  });
});
