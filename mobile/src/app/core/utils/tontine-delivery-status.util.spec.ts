import {
  canMarkTontineDeliveryAsDelivered,
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

  it('maps delivery status onto member deliveryStatus', () => {
    expect(resolveMemberDeliveryStatus('PENDING')).toBe('PENDING');
    expect(resolveMemberDeliveryStatus('DELIVERED')).toBe('DELIVERED');
    expect(resolveMemberDeliveryStatus('VALIDATED')).toBe('VALIDATED');
  });
});
