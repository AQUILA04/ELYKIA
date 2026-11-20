import { TontineStock } from 'src/app/stock-tontine/models/tontine-stock.model';

/** Stock tontine d'un commercial sur une année : pris = livré + retourné + restant. */
export interface TontineTeamLine {
  commercial: string;
  year: number;
  articles: TontineStock[];
  taken: number;
  delivered: number;
  returned: number;
  remaining: number;
  takenValue: number;
  deliveredValue: number;
  remainingValue: number;
  deliveredRate: number;
}

export interface TontineTeamTotals {
  taken: number;
  delivered: number;
  returned: number;
  remaining: number;
  takenValue: number;
  deliveredValue: number;
  remainingValue: number;
  deliveredRate: number;
  commercialsCount: number;
}

function unitPrice(stock: TontineStock): number {
  return stock.weightedAverageUnitPrice || stock.unitPrice || 0;
}

function rate(part: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, Math.round((part / total) * 100))) : 0;
}

/** Regroupe les lignes article par commercial pour une année ; le plus gros reste en valeur d'abord. */
export function tontineLines(stocks: TontineStock[], year: number): TontineTeamLine[] {
  const byCommercial = new Map<string, TontineStock[]>();
  for (const stock of stocks) {
    if (stock.year !== year) {
      continue;
    }
    const list = byCommercial.get(stock.commercial) ?? [];
    list.push(stock);
    byCommercial.set(stock.commercial, list);
  }
  return Array.from(byCommercial.entries()).map(([commercial, articles]) => {
    const sum = (pick: (s: TontineStock) => number) => articles.reduce((total, s) => total + (pick(s) || 0), 0);
    const taken = sum(s => s.totalQuantity);
    const delivered = sum(s => s.distributedQuantity);
    return {
      commercial,
      year,
      articles: [...articles].sort((a, b) => (b.availableQuantity || 0) - (a.availableQuantity || 0)
        || (a.articleName || '').localeCompare(b.articleName || '', 'fr')),
      taken,
      delivered,
      returned: sum(s => s.quantityReturned),
      remaining: sum(s => s.availableQuantity),
      takenValue: sum(s => (s.totalQuantity || 0) * unitPrice(s)),
      deliveredValue: sum(s => (s.distributedQuantity || 0) * unitPrice(s)),
      remainingValue: sum(s => (s.availableQuantity || 0) * unitPrice(s)),
      deliveredRate: rate(delivered, taken)
    };
  }).sort((a, b) => b.remainingValue - a.remainingValue || a.commercial.localeCompare(b.commercial));
}

export function tontineTotals(lines: TontineTeamLine[]): TontineTeamTotals {
  const sum = (pick: (l: TontineTeamLine) => number) => lines.reduce((total, l) => total + pick(l), 0);
  const taken = sum(l => l.taken);
  const delivered = sum(l => l.delivered);
  return {
    taken,
    delivered,
    returned: sum(l => l.returned),
    remaining: sum(l => l.remaining),
    takenValue: sum(l => l.takenValue),
    deliveredValue: sum(l => l.deliveredValue),
    remainingValue: sum(l => l.remainingValue),
    deliveredRate: rate(delivered, taken),
    commercialsCount: lines.length
  };
}

/** Années présentes dans le stock, de la plus récente à la plus ancienne. */
export function tontineYears(stocks: TontineStock[]): number[] {
  return Array.from(new Set(stocks.map(s => s.year).filter(y => Number.isInteger(y)))).sort((a, b) => b - a);
}
