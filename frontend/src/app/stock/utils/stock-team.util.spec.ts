import { CommercialMonthlyStock, CommercialMonthlyStockItem } from '../models/commercial-stock.model';
import { StockTeamLine } from '../models/stock-team.model';
import {
  daysBeforeClose, filterCounts, isOpenItem, matchesFilter, monthFromParams, monthLabel, quantitySplit,
  searchItems, sheetTotals, shiftMonth, sortItems
} from './stock-team.util';

function line(partial: Partial<StockTeamLine>): StockTeamLine {
  return {
    stockId: 1, collector: 'COM001', itemsCount: 1, itemsWithRemaining: 0, quantityTaken: 10, quantitySold: 10,
    quantityReturned: 0, quantityRemaining: 0, takenValue: 0, soldValue: 0, returnedValue: 0, remainingValue: 0,
    debtValue: 0, dueValue: 1000, recoveredValue: 800, leftToRecover: 200, recoveryRate: 80, soldRate: 100,
    merchandiseDebtId: null, debtStatus: null, debtRemaining: 0, toSettle: false, ...partial
  };
}

function item(name: string, partial: Partial<CommercialMonthlyStockItem>): CommercialMonthlyStockItem {
  return {
    article: { id: name.length, commercialName: name, name: 'STD' },
    quantityTaken: 10, quantitySold: 10, quantityReturned: 0, quantityRemaining: 0,
    weightedAverageUnitPrice: 100, weightedAveragePurchasePrice: 80, totalSoldValue: 1000, ...partial
  };
}

describe('stock-team.util', () => {
  it('navigates months across years and never goes past the current month', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    const today = new Date(2026, 10, 20);
    expect(monthFromParams('2026', '10', today)).toEqual({ year: 2026, month: 10 });
    expect(monthFromParams('2027', '1', today)).toEqual({ year: 2026, month: 11 });
    expect(monthFromParams('abc', '13', today)).toEqual({ year: 2026, month: 11 });
    expect(monthLabel({ year: 2026, month: 8 })).toBe('Août 2026');
  });

  it('counts the days left before the month closes', () => {
    expect(daysBeforeClose(new Date(2026, 10, 20))).toBe(11);
    expect(daysBeforeClose(new Date(2026, 10, 30))).toBe(1);
  });

  it('filters commercials by remaining stock, debt and low recovery', () => {
    const lines = [
      line({ collector: 'A', quantityRemaining: 2 }),
      line({ collector: 'B', debtValue: 5000 }),
      line({ collector: 'C', recoveryRate: 30 }),
      line({ collector: 'D', recoveryRate: 10, dueValue: 0 })
    ];
    expect(filterCounts(lines)).toEqual({ all: 4, remaining: 1, debt: 1, low: 1 });
    expect(matchesFilter(lines[3], 'low')).toBeFalse();
  });

  it('splits the taken quantity into shares that add up to 100', () => {
    const split = quantitySplit({ taken: 173, sold: 172, returned: 0, debt: 0, remaining: 1 });
    expect(split.remaining).toBe(1);
    expect(split.sold + split.returned + split.debt + split.remaining).toBe(100);
    expect(quantitySplit({ taken: 0, sold: 0, returned: 0, debt: 0, remaining: 0 }).sold).toBe(0);
  });

  it('puts the articles still to follow first, then sorts by name', () => {
    const items = [
      item('ZEBRE', {}),
      item('SAVON', { quantitySold: 9, quantityRemaining: 1 }),
      item('ABRICOT', {}),
      item('HUILE', { quantitySold: 8, quantityDebt: 2 })
    ];
    const sorted = sortItems(items).map(i => i.article.commercialName);
    expect(sorted).toEqual(['HUILE', 'SAVON', 'ABRICOT', 'ZEBRE']);
    expect(isOpenItem(items[0])).toBeFalse();
    expect(searchItems(items, 'savón').length).toBe(1);
  });

  it('uses the server recovery figures for the sheet totals', () => {
    const stock: CommercialMonthlyStock = {
      collector: 'COM006', year: 2026, month: 10,
      items: [item('SAVON', { quantitySold: 6, quantityReturned: 1, quantityDebt: 2, quantityRemaining: 1, totalSoldValue: 600 })],
      recoverySummary: {
        totalDueAmount: 1000, totalRecoveredAmount: 400, totalRemainingAmount: 600, recoveryRatePercent: 40,
        remainingFromPhysicalStock: 100, recoveredFromSales: 300, remainingFromCredits: 300,
        debtValueAmount: 300, debtSettledAmount: 100, debtRemainingAmount: 200
      }
    };
    const totals = sheetTotals(stock);
    expect(totals.quantityTaken).toBe(totals.quantitySold + totals.quantityReturned + totals.quantityDebt + totals.quantityRemaining);
    expect(totals.debtValue).toBe(300);
    expect(totals.leftToRecover).toBe(600);
    expect(totals.recoveryRate).toBe(40);
  });
});
