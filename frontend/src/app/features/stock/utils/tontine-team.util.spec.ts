import { TontineStock } from '@features/stock-tontine/models/tontine-stock.model';
import { tontineLines, tontineTotals, tontineYears } from './tontine-team.util';

function stock(commercial: string, year: number, taken: number, delivered: number, remaining: number, pmp = 100): TontineStock {
    return {
        commercial, year, articleId: taken, articleName: `ART-${taken}`, unitPrice: pmp, totalQuantity: taken,
        distributedQuantity: delivered, availableQuantity: remaining, quantityReturned: taken - delivered - remaining,
        weightedAverageUnitPrice: pmp
    };
}

describe('tontine-team.util', () => {
    const stocks = [
        stock('COM001', 2026, 10, 10, 0),
        stock('COM001', 2026, 5, 3, 2),
        stock('COM002', 2026, 8, 4, 4, 500),
        stock('COM002', 2025, 20, 20, 0)
    ];

    it('groups the year by commercial, largest remaining value first', () => {
        const lines = tontineLines(stocks, 2026);
        expect(lines.map(l => l.commercial)).toEqual(['COM002', 'COM001']);
        expect(lines[1]).toEqual(expect.objectContaining({ taken: 15, delivered: 13, returned: 0, remaining: 2, remainingValue: 200 }));
        expect(lines[1].articles[0].availableQuantity).toBe(2);
    });

    it('adds up the team and lists the years', () => {
        const totals = tontineTotals(tontineLines(stocks, 2026));
        expect(totals.taken).toBe(totals.delivered + totals.returned + totals.remaining);
        expect(totals.deliveredRate).toBe(74);
        expect(tontineYears(stocks)).toEqual([2026, 2025]);
    });
});
