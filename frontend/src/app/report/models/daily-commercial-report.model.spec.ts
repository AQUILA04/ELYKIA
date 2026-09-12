import {
  creditToDeposit,
  newBalanceToDeposit,
  remainingCredit,
  tontineToDeposit,
  totalRemainingToDeposit
} from './daily-commercial-report.model';

describe('daily-commercial-report.model', () => {
  it('splits categories and excludes new accounts from credit', () => {
    const report = {
      commercialUsername: 'agent1',
      date: '2026-03-01',
      totalStockRequestAmount: 0,
      creditSalesCount: 0,
      creditSalesAmount: 0,
      newClientsCount: 0,
      newAccountsBalance: 3000,
      collectionsCount: 1,
      collectionsAmount: 500,
      ordersCount: 0,
      ordersAmount: 0,
      tontineMembersCount: 0,
      tontineCollectionsCount: 1,
      tontineCollectionsAmount: 800,
      tontineDeliveriesCount: 0,
      tontineDeliveriesAmount: 0,
      totalAmountToDeposit: 0,
      totalAmountDeposited: 0,
      totalAdvancesAmount: 1000,
      totalReliquatGeneratedAmount: 0,
      totalReliquatUsedAmount: 0,
      totalCreditAmountDeposited: 400,
      totalTontineAmountDeposited: 100,
      totalNewBalanceAmountDeposited: 50,
      tontineCatchupCount: 2,
      tontineCatchupAmount: 4200
    };

    expect(creditToDeposit(report)).toBe(1500);
    expect(tontineToDeposit(report)).toBe(800);
    expect(newBalanceToDeposit(report)).toBe(3000);
    expect(remainingCredit(report)).toBe(1100);
    expect(totalRemainingToDeposit(report)).toBe(1100 + 700 + 2950);
    expect(report.tontineCatchupCount).toBe(2);
    expect(report.tontineCatchupAmount).toBe(4200);
  });
});

describe('daily-report catch-up deep-link query params', () => {
  it('targets commercial and operation date as start=end', () => {
    const queryParams = {
      collector: 'COM003',
      startDate: '2026-08-01',
      endDate: '2026-08-01'
    };
    expect(queryParams.collector).toBe('COM003');
    expect(queryParams.startDate).toBe(queryParams.endDate);
  });
});
