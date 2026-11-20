import {
  canCreateTontineOrder,
  canMarkTontineDeliveryAsDelivered,
  canPhysicallyDeliverTontine,
  canRecordDeliveryTontineCollection,
  canRecordNormalTontineCollection,
  getTontineDeliveryStatusLabel,
  hasPersistableTontineDeliveryId,
  isTontineDeliveryOrder,
  pickMemberTontineDelivery,
  resolveMemberDeliveryStatus,
  resolvePulledTontineDeliveryStatus,
  tontineDeliveryCreationMenuLabel
} from './tontine-delivery-status.util';

describe('tontine-delivery-status.util', () => {
  it('labels PENDING as Commande', () => {
    expect(getTontineDeliveryStatusLabel('PENDING')).toBe('Commande');
  });

  it('allows mark-as-delivered for PENDING and VALIDATED only', () => {
    expect(canMarkTontineDeliveryAsDelivered('PENDING')).toBeTrue();
    expect(canMarkTontineDeliveryAsDelivered('VALIDATED')).toBeTrue();
    expect(canMarkTontineDeliveryAsDelivered('DELIVERED')).toBeFalse();
  });

  it('detects order statuses', () => {
    expect(isTontineDeliveryOrder('PENDING')).toBeTrue();
    expect(isTontineDeliveryOrder('DELIVERED')).toBeFalse();
  });

  it('allows order while session is ACTIVE or CLOSED, never ENDED', () => {
    expect(canCreateTontineOrder('ACTIVE')).toBeTrue();
    expect(canCreateTontineOrder(' active ')).toBeTrue();
    expect(canCreateTontineOrder('CLOSED')).toBeTrue();
    expect(canCreateTontineOrder('closed')).toBeTrue();
    expect(canCreateTontineOrder('ENDED')).toBeFalse();
    expect(canCreateTontineOrder(null)).toBeFalse();
    expect(canCreateTontineOrder('')).toBeFalse();
  });

  it('allows physical delivery only while session is CLOSED', () => {
    expect(canPhysicallyDeliverTontine('CLOSED')).toBeTrue();
    expect(canPhysicallyDeliverTontine('closed')).toBeTrue();
    expect(canPhysicallyDeliverTontine('ACTIVE')).toBeFalse();
    expect(canPhysicallyDeliverTontine('ENDED')).toBeFalse();
    expect(canPhysicallyDeliverTontine(null)).toBeFalse();
  });

  it('allows normal collection only while the session is ACTIVE', () => {
    expect(canRecordNormalTontineCollection('ACTIVE')).toBeTrue();
    expect(canRecordNormalTontineCollection(' active ')).toBeTrue();
    expect(canRecordNormalTontineCollection('CLOSED')).toBeFalse();
    expect(canRecordNormalTontineCollection('ENDED')).toBeFalse();
    expect(canRecordNormalTontineCollection(null)).toBeFalse();
  });

  it('allows delivery top-up while ACTIVE or CLOSED, never ENDED', () => {
    expect(canRecordDeliveryTontineCollection('ACTIVE')).toBeTrue();
    expect(canRecordDeliveryTontineCollection('CLOSED')).toBeTrue();
    expect(canRecordDeliveryTontineCollection('closed')).toBeTrue();
    expect(canRecordDeliveryTontineCollection('ENDED')).toBeFalse();
    expect(canRecordDeliveryTontineCollection(null)).toBeFalse();
  });

  it('labels the member menu according to the session', () => {
    expect(tontineDeliveryCreationMenuLabel('ACTIVE')).toBe('Commande de tontine');
    expect(tontineDeliveryCreationMenuLabel('active')).toBe('Commande de tontine');
    expect(tontineDeliveryCreationMenuLabel('CLOSED')).toBe('Livraison Fin d\'Année');
    expect(tontineDeliveryCreationMenuLabel('ENDED')).toBeNull();
    expect(tontineDeliveryCreationMenuLabel(null)).toBeNull();
  });

  it('keeps the latest non-cancelled delivery and ignores the others', () => {
    const picked = pickMemberTontineDelivery([
      { id: 'old', status: 'CANCELLED', requestDate: '2026-01-01' },
      { id: 'cancelled-us', status: 'canceled', requestDate: '2026-03-01' },
      { id: 'order', status: 'pending', requestDate: '2026-02-01' },
      { id: 'newer', status: 'VALIDATED', requestDate: '2026-04-01' }
    ], 'SESSION_INPROGRESS');
    expect(picked?.id).toBe('newer');
    expect(picked?.status).toBe('VALIDATED');
  });

  it('prefers the delivered row over a PENDING twin left behind', () => {
    const picked = pickMemberTontineDelivery([
      { id: 'local-uuid', status: 'PENDING', requestDate: '2026-04-02' },
      { id: '42', status: 'DELIVERED', requestDate: '2026-04-01' }
    ], 'DELIVERED');
    expect(picked?.id).toBe('42');
    expect(picked?.status).toBe('DELIVERED');
  });

  it('does not treat a cancelled delivery as blocking when the member status is stale', () => {
    expect(pickMemberTontineDelivery(
      [{ id: 'gone', status: 'CANCELLED', requestDate: '2026-01-01' }],
      'PENDING'
    )).toBeNull();
  });

  it('backfills a status-less synced delivery from the member status', () => {
    const picked = pickMemberTontineDelivery(
      [{ id: 'd1', status: null, requestDate: '2026-05-01' }],
      'PENDING'
    );
    expect(picked?.id).toBe('d1');
    expect((picked as { status?: string | null } | null)?.status).toBe('PENDING');
  });

  it('ignores a status-less row when the member has no order', () => {
    expect(pickMemberTontineDelivery(
      [{ id: 'ghost', status: undefined, requestDate: '2026-05-01' }],
      'SESSION_INPROGRESS'
    )).toBeNull();
    expect(pickMemberTontineDelivery([], 'SESSION_INPROGRESS')).toBeNull();
    expect(pickMemberTontineDelivery(null, 'DELIVERED')).toBeNull();
  });

  it('ignores delivery rows without an id once the closed session marks every member PENDING', () => {
    expect(pickMemberTontineDelivery(
      [
        { id: null, status: 'PENDING', requestDate: null },
        { id: 'null', status: 'PENDING', requestDate: null },
        { id: undefined, status: null, requestDate: null }
      ],
      'PENDING'
    )).toBeNull();
  });

  it('accepts only real delivery ids', () => {
    expect(hasPersistableTontineDeliveryId('4')).toBeTrue();
    expect(hasPersistableTontineDeliveryId(4)).toBeTrue();
    expect(hasPersistableTontineDeliveryId('a1b2c3d4-0000-4000-8000-000000000000')).toBeTrue();
    expect(hasPersistableTontineDeliveryId(null)).toBeFalse();
    expect(hasPersistableTontineDeliveryId(undefined)).toBeFalse();
    expect(hasPersistableTontineDeliveryId('null')).toBeFalse();
    expect(hasPersistableTontineDeliveryId('undefined')).toBeFalse();
    expect(hasPersistableTontineDeliveryId('  ')).toBeFalse();
  });

  it('reads the delivery status missing from TontineDeliveryRespDto', () => {
    expect(resolvePulledTontineDeliveryStatus({ status: undefined, deliveryStatus: 'VALIDATED' }, 'SESSION_INPROGRESS'))
      .toBe('VALIDATED');
    expect(resolvePulledTontineDeliveryStatus({ status: null }, 'pending')).toBe('PENDING');
    expect(resolvePulledTontineDeliveryStatus({ status: 'DELIVERED' }, 'PENDING')).toBe('DELIVERED');
    expect(resolvePulledTontineDeliveryStatus({ status: null }, 'SESSION_INPROGRESS')).toBeNull();
    expect(resolvePulledTontineDeliveryStatus(null, null)).toBeNull();
  });

  it('maps delivery status onto member deliveryStatus', () => {
    expect(resolveMemberDeliveryStatus('PENDING')).toBe('PENDING');
    expect(resolveMemberDeliveryStatus('DELIVERED')).toBe('DELIVERED');
    expect(resolveMemberDeliveryStatus('VALIDATED')).toBe('VALIDATED');
  });
});
