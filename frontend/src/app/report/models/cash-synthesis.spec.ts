import { cashDeskBalance, depositedForCashDesk, isSupplyExpense, sumExpenseAmounts } from './cash-synthesis';

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

    it('adds catch-ups received in the period to the deposited total', () => {
        expect(depositedForCashDesk(8000, 7000)).toBe(15000);
        expect(depositedForCashDesk(15000, 0)).toBe(15000);
        expect(depositedForCashDesk(7000, -7000)).toBe(0);
    });
});
