import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { AlertService } from '@shared/service/alert.service';
import { TontineStock } from '@features/stock-tontine/models/tontine-stock.model';
import { TontineStockService } from '@features/stock-tontine/services/tontine-stock.service';
import { TontineStockMovementDialogComponent } from '@features/stock-tontine/components/tontine-stock-movement-dialog/tontine-stock-movement-dialog.component';
import { TontineDeliveryDetailsDialogComponent } from '@features/stock-tontine/components/tontine-delivery-details-dialog/tontine-delivery-details-dialog.component';
import { TontineTeamLine, TontineTeamTotals, tontineLines, tontineTotals, tontineYears } from '../../utils/tontine-team.util';

/** Une page couvre tout le stock tontine de l'équipe (une ligne par commercial et par article). */
const PAGE_SIZE = 2000;

/**
 * Onglet Tontine de la vue équipe : stock annuel pris, livré, retourné et restant,
 * par commercial puis par article. Pas de dette ni de recouvrement sur ce stock.
 */
@Component({
  selector: 'app-stock-tontine-team',
  templateUrl: './stock-tontine-team.component.html',
  standalone: false
})
export class StockTontineTeamComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  year = this.currentYear;
  years: number[] = [this.currentYear];
  stocks: TontineStock[] = [];
  lines: TontineTeamLine[] = [];
  totals: TontineTeamTotals | null = null;
  expanded = new Set<string>();
  loading = true;
  error = false;
  exporting: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private tontineStockService: TontineStockService,
    private dialog: MatDialog,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    const page = (historic: boolean) => this.tontineStockService.getAll(null, 0, PAGE_SIZE, historic).pipe(
      map((resp: any) => (resp?.data?.content ?? resp?.content ?? []) as TontineStock[])
    );
    forkJoin({
      current: page(false),
      past: page(true).pipe(catchError(() => of([] as TontineStock[])))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ current, past }) => {
        this.stocks = [...current, ...past];
        this.years = Array.from(new Set([this.currentYear, ...tontineYears(this.stocks)])).sort((a, b) => b - a);
        this.compute();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get split(): { delivered: number; returned: number; remaining: number } {
    const t = this.totals;
    if (!t || !t.taken) {
      return { delivered: 0, returned: 0, remaining: 0 };
    }
    const returned = Math.round((t.returned / t.taken) * 100);
    const remaining = Math.round((t.remaining / t.taken) * 100);
    return { delivered: Math.max(0, 100 - returned - remaining), returned, remaining };
  }

  onYearChange(year: number): void {
    this.year = Number(year);
    this.expanded.clear();
    this.compute();
  }

  toggle(line: TontineTeamLine): void {
    if (this.expanded.has(line.commercial)) {
      this.expanded.delete(line.commercial);
    } else {
      this.expanded.add(line.commercial);
    }
  }

  isExpanded(line: TontineTeamLine): boolean {
    return this.expanded.has(line.commercial);
  }

  openMovements(stock: TontineStock): void {
    this.dialog.open(TontineStockMovementDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: { tontineStockId: stock.id, articleName: stock.articleName, quantityTaken: stock.totalQuantity }
    });
  }

  openDeliveries(stock: TontineStock): void {
    this.dialog.open(TontineDeliveryDetailsDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        tontineStockId: stock.id,
        articleName: stock.articleName,
        quantityDistributed: stock.distributedQuantity,
        weightedAverageUnitPrice: stock.weightedAverageUnitPrice ?? 0
      }
    });
  }

  exportPdf(line: TontineTeamLine): void {
    if (this.exporting) {
      return;
    }
    this.exporting = line.commercial;
    this.tontineStockService.exportPdf(line.commercial, line.year).subscribe({
      next: data => {
        const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport_stock_tontine_${line.commercial}_${line.year}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exporting = null;
        this.alertService.toastSuccess(`Stock tontine de ${line.commercial} — ${line.year} téléchargé`);
      },
      error: () => {
        this.exporting = null;
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
      }
    });
  }

  remainingValue(stock: TontineStock): number {
    return (stock.availableQuantity || 0) * (stock.weightedAverageUnitPrice || stock.unitPrice || 0);
  }

  trackLine(_: number, line: TontineTeamLine): string {
    return line.commercial;
  }

  private compute(): void {
    this.lines = tontineLines(this.stocks, this.year);
    this.totals = tontineTotals(this.lines);
  }
}
