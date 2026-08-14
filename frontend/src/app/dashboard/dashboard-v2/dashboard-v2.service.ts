import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CreditService } from 'src/app/credit/service/credit.service';
import { CreditListSummary } from 'src/app/credit/types/credit-list-summary.types';
import { ClientService, ClientKpis } from 'src/app/client/service/client.service';
import { TontineCollecteService } from 'src/app/tontine/services/tontine-collecte.service';
import { ItemService, ArticleStockKpis } from 'src/app/article/service/item.service';
import { CommercialStockService } from 'src/app/stock/services/commercial-stock.service';
import { DailyOperationService } from 'src/app/report/service/daily-operation.service';
import { DailyOperationLog } from 'src/app/report/models/daily-operation-log.model';
import { BiSalesService } from 'src/app/bi/services/bi-sales.service';
import { BiCollectionsService } from 'src/app/bi/services/bi-collections.service';
import { CommercialMonthlyStock } from 'src/app/stock/models/commercial-stock.model';
import {
  CommercialStockKpi,
  computeCommercialStockKpi,
  computeWarehouseStockDonut,
  StockDonutSegments
} from './utils/commercial-stock-kpi.util';

export interface DashboardV2Period {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  label: string;
}

export interface DashboardV2CreditKpi {
  count: number;
  totalAmount: number;
  totalMargin: number;
  recoveredAmount: number;
  remainingAmount: number;
}

export interface DashboardV2TontineKpi {
  totalMontant: number;
  totalMises: number;
  totalSocietyShare: number;
}

export interface DashboardV2StockKpi {
  mode: 'commercial' | 'warehouse';
  label: string;
  countLabel: string;
  count: number;
  valuation: number;
  donut: StockDonutSegments;
  availablePercent: number;
  hasData: boolean;
  emptyMessage?: string;
}

export interface DashboardV2Data {
  credit: DashboardV2CreditKpi;
  tontine: DashboardV2TontineKpi;
  clients: ClientKpis;
  stock: DashboardV2StockKpi;
  recentSales: any[];
  recentOperations: DailyOperationLog[];
  commercialStock: CommercialMonthlyStock | null;
}

export interface ChartTrendPoint {
  label: string;
  sales: number;
  collections: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardV2Service {
  constructor(
    private creditService: CreditService,
    private clientService: ClientService,
    private tontineCollecteService: TontineCollecteService,
    private itemService: ItemService,
    private commercialStockService: CommercialStockService,
    private dailyOperationService: DailyOperationService,
    private biSalesService: BiSalesService,
    private biCollectionsService: BiCollectionsService
  ) {}

  buildPeriod(year: number, month: number): DashboardV2Period {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const label = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return {
      year,
      month,
      startDate: this.toIsoDate(start),
      endDate: this.toIsoDate(end),
      label: label.charAt(0).toUpperCase() + label.slice(1)
    };
  }

  loadDashboard(
    period: DashboardV2Period,
    collector: string | undefined,
    isPromoter: boolean,
    includeFinancialKpis = true
  ): Observable<DashboardV2Data> {
    const search = collector ? { commercial: collector } : null;

    const summary$ = includeFinancialKpis
      ? this.creditService.getListSummary({
          startDate: period.startDate,
          endDate: period.endDate,
          search
        }).pipe(
          map((res: any) => (res?.statusCode === 200 ? res.data as CreditListSummary : null)),
          catchError(() => of(null))
        )
      : of(null);

    const clients$ = this.clientService.getClientKpis(collector ?? null).pipe(catchError(() => of({
      totalRegistered: 0,
      withActiveCredit: 0,
      tontineMembers: 0,
      withoutCreditNorTontine: 0
    } as ClientKpis)));

    const emptyTontine: DashboardV2TontineKpi = { totalMontant: 0, totalMises: 0, totalSocietyShare: 0 };
    const tontine$ = includeFinancialKpis
      ? this.tontineCollecteService.getSummary(
          period.startDate,
          period.endDate,
          collector
        ).pipe(
          map((res: any) => {
            const data = res?.data ?? res;
            return {
              totalMontant: data?.totalMontant ?? 0,
              totalMises: data?.totalMises ?? 0,
              totalSocietyShare: data?.totalSocietyShare ?? 0
            } as DashboardV2TontineKpi;
          }),
          catchError(() => of(emptyTontine))
        )
      : of(emptyTontine);

    const warehouseStock$ = isPromoter
      ? of(null)
      : this.itemService.getArticleStockKpis().pipe(catchError(() => of(null)));

    const commercialStock$ = isPromoter && collector
      ? this.commercialStockService.getStockByDate(collector, period.year, period.month).pipe(
          catchError(() => this.commercialStockService.getCurrentStock(collector).pipe(catchError(() => of(null))))
        )
      : of(null);

    const recentSales$ = includeFinancialKpis
      ? this.creditService.searchCredits(search ?? {}, 0, 5).pipe(
          map((res: any) => {
            const content = res?.data?.content ?? res?.content ?? [];
            return [...content].sort((a: any, b: any) =>
              new Date(b.beginDate).getTime() - new Date(a.beginDate).getTime()
            );
          }),
          catchError(() => of([]))
        )
      : of([]);

    const recentOps$ = this.dailyOperationService.getOperations(
      period.startDate,
      period.endDate,
      isPromoter ? undefined : collector,
      0,
      5
    ).pipe(
      map((res: any) => res?.content ?? []),
      catchError(() => of([]))
    );

    return forkJoin({
      summary: summary$,
      clients: clients$,
      tontine: tontine$,
      warehouseStock: warehouseStock$,
      commercialStock: commercialStock$,
      recentSales: recentSales$,
      recentOperations: recentOps$
    }).pipe(
      map(({ summary, clients, tontine, warehouseStock, commercialStock, recentSales, recentOperations }) => {
        const inProgress = summary?.inProgressCredit;
        const credit: DashboardV2CreditKpi = {
          count: inProgress?.count ?? 0,
          totalAmount: inProgress?.totalAmount ?? 0,
          totalMargin: inProgress?.totalMargin ?? 0,
          remainingAmount: inProgress?.totalAmountRemaining ?? 0,
          recoveredAmount: Math.max(0, (inProgress?.totalAmount ?? 0) - (inProgress?.totalAmountRemaining ?? 0))
        };

        const stock = this.buildStockKpi(isPromoter, warehouseStock, commercialStock);

        return {
          credit,
          tontine,
          clients,
          stock,
          recentSales,
          recentOperations,
          commercialStock
        };
      })
    );
  }

  loadChartTrends(startDate: string, endDate: string): Observable<ChartTrendPoint[]> {
    const filter = { startDate, endDate };
    return forkJoin({
      sales: this.biSalesService.getSalesTrends(filter).pipe(catchError(() => of([]))),
      collections: this.biCollectionsService.getCollectionTrends(filter).pipe(catchError(() => of([])))
    }).pipe(
      map(({ sales, collections }) => {
        const bucket = new Map<string, ChartTrendPoint>();

        for (const point of sales ?? []) {
          const key = point.date;
          const existing = bucket.get(key) ?? { label: this.formatChartLabel(key), sales: 0, collections: 0 };
          existing.sales += point.totalAmount ?? 0;
          bucket.set(key, existing);
        }

        for (const point of collections ?? []) {
          const key = point.date;
          const existing = bucket.get(key) ?? { label: this.formatChartLabel(key), sales: 0, collections: 0 };
          existing.collections += point.collected ?? 0;
          bucket.set(key, existing);
        }

        return Array.from(bucket.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, value]) => value);
      })
    );
  }

  aggregateTrendsByMonth(points: ChartTrendPoint[]): ChartTrendPoint[] {
    const bucket = new Map<string, ChartTrendPoint>();
    for (const point of points) {
      const monthKey = point.label.slice(3);
      const existing = bucket.get(monthKey) ?? { label: monthKey, sales: 0, collections: 0 };
      existing.sales += point.sales;
      existing.collections += point.collections;
      bucket.set(monthKey, existing);
    }
    return Array.from(bucket.values());
  }

  private buildStockKpi(
    isPromoter: boolean,
    warehouseStock: ArticleStockKpis | null,
    commercialStock: CommercialMonthlyStock | null
  ): DashboardV2StockKpi {
    if (isPromoter) {
      const kpi: CommercialStockKpi = computeCommercialStockKpi(commercialStock);
      return {
        mode: 'commercial',
        label: 'Mon stock commercial',
        countLabel: 'lignes en stock',
        count: kpi.articleLinesInStock,
        valuation: kpi.valuation,
        donut: kpi.donut,
        availablePercent: kpi.availablePercent,
        hasData: kpi.hasData,
        emptyMessage: kpi.hasData ? undefined : 'Aucun stock pour cette période'
      };
    }

    const kpis = warehouseStock ?? {
      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      purchaseTotal: 0,
      creditSaleTotal: 0,
      estimatedMargin: 0,
      sellingSaleTotal: 0,
      estimatedSellingMargin: 0
    };
    const donutData = computeWarehouseStockDonut(kpis);
    return {
      mode: 'warehouse',
      label: 'Stock magasin',
      countLabel: 'articles en stock',
      count: kpis.inStockCount,
      valuation: kpis.creditSaleTotal,
      donut: {
        inStock: donutData.inStock,
        lowStock: donutData.lowStock,
        outOfStock: donutData.outOfStock
      },
      availablePercent: donutData.availablePercent,
      hasData: true
    };
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatChartLabel(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return isoDate;
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
