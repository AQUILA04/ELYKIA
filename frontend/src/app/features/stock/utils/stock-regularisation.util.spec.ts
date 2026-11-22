import { DebtDocument } from '@features/debt/models/debt.model';
import { CommercialMonthlyStockItem } from '../models/commercial-stock.model';
import { canCancelDebt, canSettleDebt, debtAmount, lifecycle, linesTotal, regularisationLines, settledShare } from './stock-regularisation.util';

function item(name: string, remaining: number, pmp: number): CommercialMonthlyStockItem {
    return {
        article: { id: name.length, commercialName: name, name: 'STD' },
        quantityTaken: 10, quantitySold: 10 - remaining, quantityReturned: 0, quantityRemaining: remaining,
        weightedAverageUnitPrice: pmp, weightedAveragePurchasePrice: 0
    };
}

function debt(partial: Partial<DebtDocument>): DebtDocument {
    return {
        id: 1, reference: 'DET-1', holderUsername: 'COM006', holderProfile: 'COMMERCIAL', debtType: 'MERCHANDISE',
        periodGrain: 'MONTH', periodYear: 2026, periodMonth: 10, status: 'OPEN', grossAmount: 1000, offsetAmount: 0,
        paidAmount: 0, remainingAmount: 1000, ...partial
    };
}

describe('stock-regularisation.util', () => {
    it('values the remaining stock like the server merchandise debt', () => {
        expect(debtAmount(3, 2199.4)).toBe(6600);
        const lines = regularisationLines([item('A', 0, 100), item('B', 2, 150.2), item('C', 1, 900)]);
        expect(lines.map(l => l.item.article.commercialName)).toEqual(['C', 'B']);
        expect(lines[1].unitPrice).toBe(151);
        expect(linesTotal(lines)).toEqual({ quantity: 3, amount: 1202 });
    });

    it('allows a cancel only before any payment, and a settlement while something is left', () => {
        expect(canCancelDebt(debt({}))).toBe(true);
        expect(canCancelDebt(debt({ status: 'PARTIALLY_SETTLED', paidAmount: 200, remainingAmount: 800 }))).toBe(false);
        expect(canSettleDebt(debt({ status: 'SETTLED', remainingAmount: 0 }))).toBe(false);
        expect(canSettleDebt(debt({ status: 'CANCELLED' }))).toBe(false);
        expect(settledShare(debt({ paidAmount: 250, offsetAmount: 100, remainingAmount: 650 }))).toBe(35);
    });

    it('marks the current step of the month lifecycle', () => {
        const open = lifecycle({ closed: true, soldRate: 84, remainingQuantity: 3, debt: null });
        expect(open.map(s => s.state)).toEqual(['done', 'done', 'done', 'current', 'todo']);

        const toPay = lifecycle({ closed: true, soldRate: 84, remainingQuantity: 0, debt: debt({}) });
        expect(toPay.map(s => s.state)).toEqual(['done', 'done', 'done', 'done', 'current']);

        const clean = lifecycle({ closed: true, soldRate: 100, remainingQuantity: 0, debt: null });
        expect(clean[4].state).toBe('done');

        const running = lifecycle({ closed: false, soldRate: 40, remainingQuantity: 5, debt: null });
        expect(running.map(s => s.state)).toEqual(['done', 'current', 'todo', 'todo', 'todo']);
    });
});
