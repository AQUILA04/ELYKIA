import { Component, Input } from '@angular/core';
import { ArticlePriceHistoryItem } from '../../../service/item.service';

interface PriceChange {
  label: string;
  previous: number;
  next: number;
}

@Component({
  selector: 'app-price-history-timeline',
  templateUrl: './price-history-timeline.component.html',
  styleUrls: ['./price-history-timeline.component.scss'],
  standalone: false
})
export class PriceHistoryTimelineComponent {
  @Input() priceHistory: ArticlePriceHistoryItem[] = [];
  @Input() canViewCreditPrice = false;
  @Input() isGestionnaire = false;
  @Input() limit = 8;

  get displayedHistory(): ArticlePriceHistoryItem[] {
    return this.priceHistory.slice(0, this.limit);
  }

  getChanges(entry: ArticlePriceHistoryItem): PriceChange[] {
    const changes: PriceChange[] = [];

    if (this.isGestionnaire && entry.previousPurchasePrice !== entry.newPurchasePrice) {
      changes.push({
        label: "Prix d'achat",
        previous: entry.previousPurchasePrice,
        next: entry.newPurchasePrice
      });
    }

    if (this.isGestionnaire && entry.previousSellingPrice !== entry.newSellingPrice) {
      changes.push({
        label: 'Prix de vente',
        previous: entry.previousSellingPrice,
        next: entry.newSellingPrice
      });
    }

    if (this.canViewCreditPrice && entry.previousCreditSalePrice !== entry.newCreditSalePrice) {
      changes.push({
        label: 'Vente à crédit',
        previous: entry.previousCreditSalePrice,
        next: entry.newCreditSalePrice
      });
    }

    return changes;
  }

  deltaClass(previous: number, next: number): string {
    if (next > previous) return 'delta-up';
    if (next < previous) return 'delta-down';
    return 'delta-flat';
  }

  deltaPrefix(previous: number, next: number): string {
    if (next > previous) return '+';
    if (next < previous) return '−';
    return '';
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
