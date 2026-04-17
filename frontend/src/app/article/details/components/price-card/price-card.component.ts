import { Component, Input } from '@angular/core';
import { Article } from '../../../service/item.service';

@Component({
    selector: 'app-price-card',
    templateUrl: './price-card.component.html',
    styleUrls: ['./price-card.component.scss'],
    standalone: false
})
export class PriceCardComponent {
    @Input() article!: Article;
    @Input() isGestionnaire = false;
    @Input() canViewCreditPrice = false;

    get marginCash(): number {
        return (this.article?.sellingPrice ?? 0) - (this.article?.purchasePrice ?? 0);
    }

    get marginCredit(): number {
        return (this.article?.creditSalePrice ?? 0) - (this.article?.purchasePrice ?? 0);
    }

    get marginCashPct(): string {
        const pa = this.article?.purchasePrice;
        if (!pa) return '0%';
        return ((this.marginCash / pa) * 100).toFixed(1) + '%';
    }

    get marginCreditPct(): string {
        const pa = this.article?.purchasePrice;
        if (!pa) return '0%';
        return ((this.marginCredit / pa) * 100).toFixed(1) + '%';
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
