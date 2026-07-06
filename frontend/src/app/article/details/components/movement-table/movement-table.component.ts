import { Component, Input } from '@angular/core';
import { ArticleHistoryItem } from '../../../service/item.service';

@Component({
    selector: 'app-movement-table',
    templateUrl: './movement-table.component.html',
    styleUrls: ['./movement-table.component.scss'],
    standalone: false
})
export class MovementTableComponent {
    @Input() movements: ArticleHistoryItem[] = [];
    @Input() limit = 6;

    get displayedMovements(): ArticleHistoryItem[] {
        return this.movements.slice(0, this.limit);
    }

    badgeClass(op: string): string {
        if (op === 'ENTREE') return 'op-entree';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return 'op-sortie';
        return 'op-reset';
    }

    formatOperationType(op: string): string {
        if (op === 'CANCEL_RECEPTION') return 'ANNUL. RÉCEPTION';
        if (op === 'INVENTORY_ADJUSTMENT') return 'AJUSTEMENT INVENT.';
        return op;
    }

    qtyClass(op: string): string {
        if (op === 'ENTREE') return 'qty-plus';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return 'qty-minus';
        return 'qty-reset';
    }

    qtyPrefix(op: string): string {
        if (op === 'ENTREE') return '+';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return '−';
        return '';
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
