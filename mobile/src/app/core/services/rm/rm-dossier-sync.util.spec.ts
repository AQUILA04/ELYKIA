import {
  buildRmSyncIndex,
  emptyRmSyncIndex,
  isClientLocal,
  isCreditLocal,
  isTontineLocal,
  RmSyncQueueSnapshot
} from './rm-dossier-sync.util';

function queues(partial: Partial<RmSyncQueueSnapshot> = {}): RmSyncQueueSnapshot {
  return {
    closes: [],
    creditControls: [],
    creditCarnets: [],
    tontineControls: [],
    tontineCarnets: [],
    contacts: [],
    assigns: [],
    ...partial
  };
}

describe('buildRmSyncIndex', () => {
  it('laisse Sync un dossier sans opération en attente', () => {
    const index = buildRmSyncIndex(queues({
      closes: [{ creditId: 8, isSync: true }],
      contacts: [{ clientId: 3, isSync: true }]
    }));
    expect(isCreditLocal(index, 8, 3)).toBeFalse();
    expect(isClientLocal(index, 3)).toBeFalse();
    expect(isCreditLocal(emptyRmSyncIndex(), 1, 2)).toBeFalse();
  });

  it('marque Local un crédit avec une clôture, un contrôle ou un carnet non transmis', () => {
    const index = buildRmSyncIndex(queues({
      closes: [{ creditId: 1, isSync: false }],
      creditControls: [{ creditId: 2, isSync: false }],
      creditCarnets: [{ creditId: 3, isSync: false }]
    }));
    expect(isCreditLocal(index, 1)).toBeTrue();
    expect(isCreditLocal(index, 2)).toBeTrue();
    expect(isCreditLocal(index, 3)).toBeTrue();
    expect(isCreditLocal(index, 4)).toBeFalse();
  });

  it('marque Local le crédit quand le contact ou le transfert du client est encore sur le téléphone', () => {
    const index = buildRmSyncIndex(queues({
      contacts: [{ clientId: 10, isSync: false }],
      assigns: [{ clientIds: [11, 12], isSync: false }]
    }));
    expect(isCreditLocal(index, 99, 10)).toBeTrue();
    expect(isTontineLocal(index, 5, 11)).toBeTrue();
    expect(isClientLocal(index, 12)).toBeTrue();
  });

  it('garde Local après un échec de synchronisation', () => {
    const index = buildRmSyncIndex(queues({
      tontineControls: [{ tontineMemberId: 7, isSync: false }],
      tontineCarnets: [{ tontineMemberId: 8, isSync: true }]
    }));
    expect(isTontineLocal(index, 7)).toBeTrue();
    expect(isTontineLocal(index, 8)).toBeFalse();
  });

  it('relie la carte client au crédit ou au membre encore local', () => {
    const index = buildRmSyncIndex(queues({
      closes: [{ creditId: 40, isSync: false }],
      tontineCarnets: [{ tontineMemberId: 50, isSync: false }]
    }));
    expect(isClientLocal(index, 9, { creditIds: [40] })).toBeTrue();
    expect(isClientLocal(index, 9, { memberIds: [50] })).toBeTrue();
    expect(isClientLocal(index, 9, { creditIds: [41], memberIds: [51] })).toBeFalse();
  });
});
