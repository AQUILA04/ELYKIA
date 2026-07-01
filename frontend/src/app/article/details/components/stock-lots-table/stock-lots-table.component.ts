import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ArticleStockLot, StockFifoFeatureService } from 'src/app/stock/services/stock-fifo-feature.service';

@Component({
  selector: 'app-stock-lots-table',
  templateUrl: './stock-lots-table.component.html',
  styleUrls: ['./stock-lots-table.component.scss'],
  standalone: false
})
export class StockLotsTableComponent implements OnChanges {
  @Input() articleId?: number;
  @Input() fifoEnabled = false;

  lots: ArticleStockLot[] = [];
  isLoading = false;

  constructor(private stockFifoFeatureService: StockFifoFeatureService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articleId'] || changes['fifoEnabled']) {
      this.loadLots();
    }
  }

  get totalFifoValue(): number {
    return this.lots.reduce((sum, lot) => sum + (lot.remainingValue ?? 0), 0);
  }

  loadLots(): void {
    if (!this.fifoEnabled || !this.articleId) {
      this.lots = [];
      return;
    }

    this.isLoading = true;
    this.stockFifoFeatureService.getArticleLots(this.articleId).subscribe({
      next: (lots) => {
        this.lots = lots;
        this.isLoading = false;
      },
      error: () => {
        this.lots = [];
        this.isLoading = false;
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  sourceLabel(sourceType?: string): string {
    const labels: Record<string, string> = {
      STOCK_RECEPTION: 'Réception',
      STOCK_RETURN: 'Retour',
      MIGRATION: 'Migration',
      INVENTORY_ADJUSTMENT: 'Ajustement'
    };
    return sourceType ? (labels[sourceType] ?? sourceType) : '—';
  }
}
