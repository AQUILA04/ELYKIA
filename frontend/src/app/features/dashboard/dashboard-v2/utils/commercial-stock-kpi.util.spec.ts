import { computeCommercialStockKpi, computeWarehouseStockDonut } from './commercial-stock-kpi.util';

describe('commercial-stock-kpi.util', () => {
  it('computes commercial stock valuation from remaining quantities', () => {
    const kpi = computeCommercialStockKpi({
      collector: 'COM01',
      month: 6,
      year: 2026,
      items: [
        { quantityTaken: 10, quantityRemaining: 8, weightedAverageUnitPrice: 1000 } as any,
        { quantityTaken: 5, quantityRemaining: 2, weightedAverageUnitPrice: 500 } as any,
        { quantityTaken: 3, quantityRemaining: 0, weightedAverageUnitPrice: 200 } as any
      ]
    });

    expect(kpi.articleLinesInStock).toBe(2);
    expect(kpi.totalUnits).toBe(10);
    expect(kpi.valuation).toBe(9000);
    expect(kpi.donut.inStock).toBe(8);
    expect(kpi.donut.lowStock).toBe(2);
    expect(kpi.donut.outOfStock).toBe(1);
  });

  it('computes warehouse donut segments', () => {
    const donut = computeWarehouseStockDonut({
      inStockCount: 100,
      lowStockCount: 20,
      outOfStockCount: 10
    });

    expect(donut.inStock).toBe(80);
    expect(donut.lowStock).toBe(20);
    expect(donut.outOfStock).toBe(10);
  });
});
