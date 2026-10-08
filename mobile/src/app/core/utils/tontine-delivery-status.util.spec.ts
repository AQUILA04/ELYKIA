import {
  canCreateTontineOrder,
  canMarkTontineDeliveryAsDelivered,
  canPhysicallyDeliverTontine,
  getTontineDeliveryStatusLabel,
  isTontineDeliveryOrder,
  resolveMemberDeliveryStatus
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

  it('allows order only while session is ACTIVE', () => {
    expect(canCreateTontineOrder('ACTIVE')).toBeTrue();
    expect(canCreateTontineOrder('CLOSED')).toBeFalse();
    expect(canCreateTontineOrder('ENDED')).toBeFalse();
  });

  it('allows physical delivery only while session is CLOSED', () => {
    expect(canPhysicallyDeliverTontine('CLOSED')).toBeTrue();
    expect(canPhysicallyDeliverTontine('ACTIVE')).toBeFalse();
    expect(canPhysicallyDeliverTontine('ENDED')).toBeFalse();
  });

  it('maps delivery status onto member deliveryStatus', () => {
    expect(resolveMemberDeliveryStatus('PENDING')).toBe('PENDING');
    expect(resolveMemberDeliveryStatus('DELIVERED')).toBe('DELIVERED');
    expect(resolveMemberDeliveryStatus('VALIDATED')).toBe('VALIDATED');
  });
});
