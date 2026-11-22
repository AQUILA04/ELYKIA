import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { StockLinkedSale, StockLinkedSalesResponse } from '../../models/stock-linked-sales.model';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { normalize } from '../../utils/stock-team.util';

export type SalesFilter = 'all' | 'open' | 'settled';

const STATUS_LABELS: Record<string, string> = {
  INPROGRESS: 'En cours',
  DELIVERED: 'Livré',
  ENDED: 'Terminé',
  SETTLED: 'Soldé',
  CREATED: 'Créé',
  VALIDATED: 'Validé',
  MERGED: 'Fusionné',
  CANCELLED: 'Annulé',
  CASH: 'Comptant'
};

/** Une vente est soldée quand le client n'a plus rien à payer. */
export function isSettledSale(sale: StockLinkedSale): boolean {
  if (sale.remainingAmount != null) {
    return sale.remainingAmount <= 0.5;
  }
  return sale.status === 'SETTLED' || sale.status === 'ENDED';
}

/** Panneau latéral des ventes qui ont débité un stock mensuel, avec le contrôle de concordance. */
@Component({
  selector: 'app-stock-linked-sales-panel',
  templateUrl: './stock-linked-sales-panel.component.html',
  standalone: false
})
export class StockLinkedSalesPanelComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) stockId!: number;
  @Input() collector = '';
  @Input() monthTitle = '';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;

  response: StockLinkedSalesResponse | null = null;
  loading = true;
  error = false;
  search = '';
  filter: SalesFilter = 'all';

  private sub?: Subscription;

  constructor(private stockService: CommercialStockService, private router: Router) { }

  get sales(): StockLinkedSale[] {
    return this.response?.sales ?? [];
  }

  get counts(): Record<SalesFilter, number> {
    const settled = this.sales.filter(isSettledSale).length;
    return { all: this.sales.length, open: this.sales.length - settled, settled };
  }

  get visibleSales(): StockLinkedSale[] {
    const query = normalize(this.search);
    return this.sales.filter(sale => {
      if (this.filter === 'open' && isSettledSale(sale)) {
        return false;
      }
      if (this.filter === 'settled' && !isSettledSale(sale)) {
        return false;
      }
      return !query || normalize(`${sale.reference} ${sale.clientFullName}`).includes(query);
    });
  }

  get consistent(): boolean {
    return this.response?.consistent ?? true;
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

  setFilter(filter: SalesFilter): void {
    this.filter = filter;
  }

  statusLabel(sale: StockLinkedSale): string {
    if (isSettledSale(sale)) {
      return 'Soldé';
    }
    return sale.status ? (STATUS_LABELS[sale.status] ?? sale.status) : 'En cours';
  }

  openCredit(sale: StockLinkedSale): void {
    if (sale.creditId) {
      this.router.navigate(['/credit/details', sale.creditId]);
    }
  }

  private load(): void {
    this.sub?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.sub = this.stockService.getLinkedSales(this.stockId).subscribe({
      next: response => {
        this.response = response;
        this.loading = false;
      },
      error: () => {
        this.response = null;
        this.loading = false;
        this.error = true;
      }
    });
  }
}
