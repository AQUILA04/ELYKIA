import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CreditService } from 'src/app/credit/service/credit.service';
import { CommercialMonthlyStockItem } from '../../models/commercial-stock.model';
import { CreditSaleDetail, SoldValueHistoryEntry } from '../../models/sold-value-history.model';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { articleLabel } from '../../utils/stock-team.util';

export type ArticleTab = 'movements' | 'sales' | 'valuation';

export interface ArticleMovement {
  movementType: string;
  operationDate?: string;
  quantityBefore?: number;
  quantityMoved?: number;
  quantityAfter?: number;
  creditReference?: string;
  stockReturnId?: number;
}

export interface ArticleSaleRow {
  date?: string;
  reference?: string;
  clientName?: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  cumulative?: number;
}

const MOVEMENT_LABELS: Record<string, string> = {
  CREDIT_SALE: 'Vente crédit',
  CASH_SALE: 'Vente comptant',
  STOCK_IN: 'Entrée stock',
  RETURN: 'Retour',
  ADJUSTMENT: 'Ajustement'
};

/** Écart toléré entre le total vendu du stock et la somme des valorisations. */
const VALUATION_TOLERANCE = 1;

/**
 * Panneau latéral d'un article du stock : mouvements, ventes et valorisation.
 * Remplace les fenêtres « Historique des mouvements » et « Détails des ventes ».
 */
@Component({
  selector: 'app-stock-article-panel',
  templateUrl: './stock-article-panel.component.html',
  standalone: false
})
export class StockArticlePanelComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) item!: CommercialMonthlyStockItem;
  @Input() collector = '';
  @Input() monthTitle = '';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;

  tab: ArticleTab = 'movements';
  loading = true;
  error = false;
  movements: ArticleMovement[] = [];
  sales: ArticleSaleRow[] = [];
  valuations: ArticleSaleRow[] = [];
  valuationTotal = 0;

  private sub?: Subscription;

  constructor(
    private stockService: CommercialStockService,
    private creditService: CreditService
  ) { }

  get title(): string {
    return articleLabel(this.item);
  }

  get valuationGap(): number {
    return (this.item.totalSoldValue ?? 0) - this.valuationTotal;
  }

  get valuationConsistent(): boolean {
    return Math.abs(this.valuationGap) <= VALUATION_TOLERANCE;
  }

  ngOnChanges(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.closeButton?.nativeElement.focus(), 0);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  select(tab: ArticleTab): void {
    this.tab = tab;
  }

  movementLabel(type: string): string {
    return MOVEMENT_LABELS[type] ?? type;
  }

  isEntry(type: string): boolean {
    return type === 'STOCK_IN';
  }

  movementRef(movement: ArticleMovement): string | null {
    if (movement.creditReference) {
      return movement.creditReference;
    }
    if (movement.stockReturnId) {
      return movement.movementType === 'STOCK_IN' ? `Livraison #${movement.stockReturnId}` : `Retour #${movement.stockReturnId}`;
    }
    return null;
  }

  private load(): void {
    const id = this.item?.id;
    this.sub?.unsubscribe();
    if (!id) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = false;
    this.sub = forkJoin({
      movements: this.stockService.getStockMovements(id).pipe(map(resp => (resp?.data ?? []) as ArticleMovement[])),
      details: this.creditService.getSalesDetails(id).pipe(
        map(resp => (resp?.data ?? []) as CreditSaleDetail[]),
        catchError(() => of([] as CreditSaleDetail[]))
      ),
      history: this.stockService.getSoldValueHistory(id).pipe(catchError(() => of([] as SoldValueHistoryEntry[])))
    }).subscribe({
      next: ({ movements, details, history }) => {
        this.movements = [...movements].sort((a, b) => time(b.operationDate) - time(a.operationDate));
        this.buildSales(details, history ?? []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  /** Une ligne par vente : la valorisation (date, PMP, montant) complétée du nom du client. */
  private buildSales(details: CreditSaleDetail[], history: SoldValueHistoryEntry[]): void {
    const clients = new Map(details.map(detail => [detail.reference, detail.clientName]));
    const ordered = [...history].sort((a, b) => time(a.createdDate) - time(b.createdDate));
    this.valuations = ordered.map(entry => ({
      date: entry.createdDate,
      reference: entry.creditReference,
      clientName: entry.creditReference ? clients.get(entry.creditReference) : undefined,
      quantity: entry.quantity,
      unitPrice: entry.weightedAverageUnitPrice ?? entry.saleUnitPrice,
      amount: entry.deltaValue,
      cumulative: entry.newTotalSoldValue
    }));
    this.valuationTotal = ordered.reduce((sum, entry) => sum + (entry.deltaValue || 0), 0);
    const sales = this.valuations.filter(row => row.reference).reverse();
    // Sans historique de valorisation (ventes anciennes), la liste des ventes clients reste affichée.
    this.sales = sales.length ? sales : details.map(detail => ({
      reference: detail.reference,
      clientName: detail.clientName,
      quantity: detail.quantity
    }));
  }
}

function time(value?: string): number {
  return value ? new Date(value).getTime() || 0 : 0;
}
