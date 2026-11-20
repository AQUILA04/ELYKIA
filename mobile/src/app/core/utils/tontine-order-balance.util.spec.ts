import { computeTontineOrderBalance, tontineOrderBalanceLabels } from './tontine-order-balance.util';

describe('tontine-order-balance.util', () => {
  it('leaves an amount to pay when the order exceeds the net balance', () => {
    expect(computeTontineOrderBalance(40000, 55000)).toEqual({
      netContribution: 40000,
      orderTotal: 55000,
      amountDue: 15000,
      refundableBalance: 0
    });
  });

  it('leaves a balance to refund when the order is below the net balance', () => {
    const balance = computeTontineOrderBalance(60000, 45500);
    expect(balance.amountDue).toBe(0);
    expect(balance.refundableBalance).toBe(14500);
  });

  it('leaves nothing when the order matches the balance', () => {
    const balance = computeTontineOrderBalance(30000.004, 30000);
    expect(balance.amountDue).toBe(0);
    expect(balance.refundableBalance).toBe(0);
  });

  it('treats missing amounts as zero', () => {
    expect(computeTontineOrderBalance(undefined, null)).toEqual({
      netContribution: 0, orderTotal: 0, amountDue: 0, refundableBalance: 0
    });
  });

  it('switches to contributed / used / remaining once delivered', () => {
    expect(tontineOrderBalanceLabels(true).net).toBe('Total cotisé (net)');
    expect(tontineOrderBalanceLabels(true).refundable).toBe('Total restant');
    expect(tontineOrderBalanceLabels(false).refundable).toBe('Reliquat à restituer');
  });
});
