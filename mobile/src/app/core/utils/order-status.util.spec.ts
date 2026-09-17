import {
  canAcceptOrder,
  canCancelOrder,
  canDeliverOrder,
  canModifyOrder,
  canTransitionOrderStatus,
  getOrderStatusLabel,
  getOrderStatusTransitionPath
} from './order-status.util';

describe('order-status.util', () => {
  it('allows backend-aligned transitions', () => {
    expect(canTransitionOrderStatus('PENDING', 'ACCEPTED')).toBeTrue();
    expect(canTransitionOrderStatus('PENDING', 'CANCEL')).toBeTrue();
    expect(canTransitionOrderStatus('ACCEPTED', 'SOLD')).toBeTrue();
    expect(canTransitionOrderStatus('PENDING', 'SOLD')).toBeFalse();
    expect(canTransitionOrderStatus('SOLD', 'PENDING')).toBeFalse();
  });

  it('builds path PENDING → SOLD via ACCEPTED', () => {
    expect(getOrderStatusTransitionPath('PENDING', 'SOLD')).toEqual(['ACCEPTED', 'SOLD']);
    expect(getOrderStatusTransitionPath('ACCEPTED', 'SOLD')).toEqual(['SOLD']);
    expect(getOrderStatusTransitionPath('PENDING', 'PENDING')).toEqual([]);
  });

  it('exposes commercial action helpers', () => {
    expect(canModifyOrder('PENDING')).toBeTrue();
    expect(canAcceptOrder('PENDING')).toBeTrue();
    expect(canCancelOrder('PENDING')).toBeTrue();
    expect(canDeliverOrder('PENDING')).toBeTrue();
    expect(canDeliverOrder('ACCEPTED')).toBeTrue();
    expect(canDeliverOrder('SOLD')).toBeFalse();
  });

  it('labels SOLD as Livrée for commercial UX', () => {
    expect(getOrderStatusLabel('SOLD')).toBe('Livrée');
    expect(getOrderStatusLabel('PENDING')).toBe('En attente');
  });
});
