import { CommercialMonthlyStock, CommercialMonthlyStockItem } from 'src/app/stock/models/commercial-stock.model';

export interface StockDonutSegments {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface CommercialStockKpi {
  articleLinesInStock: number;
  totalUnits: number;
  valuation: number;
  donut: StockDonutSegments;
  availablePercent: number;
  hasData: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

export function computeCommercialStockKpi(stock: CommercialMonthlyStock | null | undefined): CommercialStockKpi {
  const items: CommercialMonthlyStockItem[] = stock?.items ?? [];
  if (!items.length) {
    return {
      articleLinesInStock: 0,
      totalUnits: 0,
      valuation: 0,
      donut: { inStock: 0, lowStock: 0, outOfStock: 0 },
      availablePercent: 0,
      hasData: false
    };
  }

  let articleLinesInStock = 0;
  let totalUnits = 0;
  let valuation = 0;
  const donut: StockDonutSegments = { inStock: 0, lowStock: 0, outOfStock: 0 };
  let totalTaken = 0;

  for (const item of items) {
    const remaining = item.quantityRemaining ?? 0;
    const taken = item.quantityTaken ?? 0;
    totalTaken += taken;

    if (remaining > 0) {
      articleLinesInStock += 1;
      totalUnits += remaining;
      const unitPrice = item.weightedAverageUnitPrice ?? 0;
      valuation += remaining * unitPrice;
    }

    if (remaining === 0) {
      donut.outOfStock += 1;
    } else if (remaining <= LOW_STOCK_THRESHOLD) {
      donut.lowStock += remaining;
    } else {
      donut.inStock += remaining;
    }
  }

  const availablePercent = totalTaken > 0
    ? Math.round((totalUnits / totalTaken) * 100)
    : (totalUnits > 0 ? 100 : 0);

  return {
    articleLinesInStock,
    totalUnits,
    valuation,
    donut,
    availablePercent,
    hasData: true
  };
}

export function computeWarehouseStockDonut(kpis: {
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}): StockDonutSegments & { availablePercent: number } {
  const inStock = Math.max(0, kpis.inStockCount - kpis.lowStockCount);
  const total = inStock + kpis.lowStockCount + kpis.outOfStockCount;
  const availablePercent = total > 0 ? Math.round((inStock / total) * 100) : 0;
  return {
    inStock,
    lowStock: kpis.lowStockCount,
    outOfStock: kpis.outOfStockCount,
    availablePercent
  };
}
