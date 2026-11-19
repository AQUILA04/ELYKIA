import {
    cashDeskBalance,
    cashDueBreakdown,
    cashEncaisseBreakdown,
    depositedForCashDesk,
    EMPTY_CATCHUP_CASH_ADJUSTMENT,
    isSupplyExpense,
    normalizeCatchupCashAdjustment,
    sumExpenseAmounts
} from './cash-synthesis';

describe('cash-synthesis', () => {
    const expenses = [
        { amount: 1000, expenseTypeName: 'Carburant' },
        { amount: '2500', expenseTypeName: 'Approvisionnement' },
        { amount: 400, expenseTypeName: 'approvisionnement' },
        { amount: null, expenseTypeName: 'Divers' }
    ];

    it('detects the supply expense type regardless of case', () => {
        expect(isSupplyExpense('Approvisionnement')).toBeTrue();
        expect(isSupplyExpense('  approvisionnement ')).toBeTrue();
        expect(isSupplyExpense('Carburant')).toBeFalse();
        expect(isSupplyExpense(null)).toBeFalse();
    });

    it('sums every expense, including supply', () => {
        expect(sumExpenseAmounts(expenses)).toBe(3900);
    });

    it('excludes supply expenses from the operating total', () => {
        expect(sumExpenseAmounts(expenses, { excludeSupply: true })).toBe(1000);
    });

    it('computes the cash balance as deposits minus expenses without supply', () => {
        expect(cashDeskBalance(8000, 1000)).toBe(7000);
        expect(cashDeskBalance(500, 1000)).toBe(-500);
    });

    it('splits the cash received into period operations and catch-ups', () => {
        expect(cashEncaisseBreakdown(150000, 50000, 0)).toEqual({
            total: 200000, operations: 150000, catchups: 50000, deferred: 0
        });
    });

    it('deducts amounts deposited outside the period from the operations part', () => {
        expect(cashEncaisseBreakdown(113800, 14300, 800)).toEqual({
            total: 127300, operations: 113000, catchups: 14300, deferred: 800
        });
    });

    it('keeps the total equal to the former synthesis total', () => {
        const breakdown = cashEncaisseBreakdown(362650, 14300, 0);
        expect(breakdown.total).toBe(depositedForCashDesk(362650, 14300));
        expect(breakdown.total).toBe(376950);
    });

    it('normalizes a missing or partial server answer', () => {
        expect(normalizeCatchupCashAdjustment(null)).toEqual(EMPTY_CATCHUP_CASH_ADJUSTMENT);
        const legacy = normalizeCatchupCashAdjustment({ amount: 7000 });
        expect(legacy.amount).toBe(7000);
        expect(legacy.byCommercial).toEqual([]);
        const detailed = normalizeCatchupCashAdjustment({
            catchupReceivedAmount: 12100, deferredAmount: 400,
            byCommercial: [{ commercialUsername: 'COM005', catchupReceivedAmount: 12100, deferredAmount: 0 }]
        });
        expect(detailed.amount).toBe(11700);
        expect(detailed.byCommercial[0].commercialUsername).toBe('COM005');
    });

    it('adds catch-ups received in the period to the deposited total', () => {
        expect(depositedForCashDesk(8000, 7000)).toBe(15000);
        expect(depositedForCashDesk(15000, 0)).toBe(15000);
        expect(depositedForCashDesk(7000, -7000)).toBe(0);
    });

    it('reads catch-ups entered in the period, global and per commercial', () => {
        const body = normalizeCatchupCashAdjustment({
            catchupReceivedAmount: 1000,
            catchupEnteredAmount: 3500,
            byCommercial: [{ commercialUsername: 'COM005', catchupReceivedAmount: 1000, catchupEnteredAmount: 3000 }]
        });
        expect(body.catchupEnteredAmount).toBe(3500);
        expect(body.byCommercial[0].catchupEnteredAmount).toBe(3000);
        expect(body.byCommercial[0].deferredAmount).toBe(0);
        expect(normalizeCatchupCashAdjustment({ amount: 10 }).catchupEnteredAmount).toBe(0);
    });

    it('adds catch-ups entered to the amount due for the period', () => {
        expect(cashDueBreakdown(100300, 13300)).toEqual({ total: 113600, operations: 100300, catchups: 13300 });
        expect(cashDueBreakdown(0, 0).total).toBe(0);
        expect(cashDueBreakdown(NaN, 500).total).toBe(500);
    });
});
