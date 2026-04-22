import { Component, Input, OnChanges } from '@angular/core';
import { Article } from '../../../service/item.service';

@Component({
    selector: 'app-stock-gauge',
    templateUrl: './stock-gauge.component.html',
    styleUrls: ['./stock-gauge.component.scss'],
    standalone: false
})
export class StockGaugeComponent implements OnChanges {
    @Input() article!: Article;

    stockPercent = 0;
    dashOffset = 0;

    private readonly CIRCUMFERENCE = 2 * Math.PI * 50; // ~314.16

    ngOnChanges(): void {
        this.computeGauge();
    }

    private computeGauge(): void {
        if (!this.article) return;
        const qty = this.article.stockQuantity ?? 0;
        const optimal = this.article.optimalStockLevel ?? 0;
        this.stockPercent = optimal > 0 ? Math.min(100, Math.round((qty / optimal) * 100)) : qty > 0 ? 100 : 0;
        this.dashOffset = this.CIRCUMFERENCE - (this.stockPercent / 100) * this.CIRCUMFERENCE;
    }

    get ringClass(): string {
        const qty = this.article?.stockQuantity ?? 0;
        const reorder = this.article?.reorderPoint ?? 0;
        if (qty === 0) return 'ring-out';
        if (reorder > 0 && qty <= reorder) return 'ring-low';
        return 'ring-ok';
    }

    get statusClass(): string {
        const r = this.ringClass;
        if (r === 'ring-out') return 'st-out';
        if (r === 'ring-low') return 'st-low';
        return 'st-ok';
    }

    get statusLabel(): string {
        const r = this.ringClass;
        if (r === 'ring-out') return '✕ Rupture de stock';
        if (r === 'ring-low') return '⚠ Stock faible';
        return '✓ Stock OK';
    }

    get reorderAlert(): boolean {
        const qty = this.article?.stockQuantity ?? 0;
        const reorder = this.article?.reorderPoint ?? 0;
        return reorder > 0 && qty <= reorder;
    }

    get daysCoverage(): number {
        const avg = this.article?.averageMonthlySales;
        if (!avg || avg === 0) return 0;
        const daily = avg / 30;
        return Math.floor((this.article?.stockQuantity ?? 0) / daily);
    }
}
