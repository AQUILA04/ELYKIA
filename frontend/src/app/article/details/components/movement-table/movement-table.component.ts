import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Params } from '@angular/router';
import { ArticleHistoryItem } from '../../../service/item.service';
import { MovementListDialogComponent } from '../movement-list-dialog/movement-list-dialog.component';

@Component({
    selector: 'app-movement-table',
    templateUrl: './movement-table.component.html',
    styleUrls: ['./movement-table.component.scss'],
    standalone: false
})
export class MovementTableComponent {
    @Input() movements: ArticleHistoryItem[] = [];
    @Input() limit = 6;
    @Input() articleName?: string;

    constructor(private dialog: MatDialog) {}

    get displayedMovements(): ArticleHistoryItem[] {
        return this.movements.slice(0, this.limit);
    }

    badgeClass(op: string): string {
        if (op === 'ENTREE' || op === 'RETURN') return 'op-entree';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return 'op-sortie';
        return 'op-reset';
    }

    formatOperationType(op: string): string {
        if (op === 'CANCEL_RECEPTION') return 'ANNUL. RÉCEPTION';
        if (op === 'INVENTORY_ADJUSTMENT') return 'AJUSTEMENT INVENT.';
        if (op === 'RETURN') return 'RETURN';
        return op;
    }

    qtyClass(op: string): string {
        if (op === 'ENTREE' || op === 'RETURN') return 'qty-plus';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return 'qty-minus';
        return 'qty-reset';
    }

    qtyPrefix(op: string): string {
        if (op === 'ENTREE' || op === 'RETURN') return '+';
        if (op === 'SORTIE' || op === 'CANCEL_RECEPTION') return '−';
        return '';
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    getBeneficiary(movement: ArticleHistoryItem): string {
        return movement.beneficiary || movement.operationUser || '—';
    }

    showAuthor(movement: ArticleHistoryItem): boolean {
        const beneficiary = movement.beneficiary;
        return !!beneficiary && !!movement.operationUser && beneficiary !== movement.operationUser;
    }

    hasReferenceLink(movement: ArticleHistoryItem): boolean {
        return !!movement.referenceType && !!movement.referenceId && !!this.getReferenceRoute(movement);
    }

    getReferenceRoute(movement: ArticleHistoryItem): string | any[] | null {
        if (!movement.referenceType || !movement.referenceId) {
            return null;
        }
        switch (movement.referenceType) {
            case 'STOCK_REQUEST':
                return ['/stock/request'];
            case 'STOCK_RETURN':
                return ['/stock/return'];
            case 'STOCK_TONTINE_REQUEST':
                return ['/stock-tontine/request'];
            case 'STOCK_TONTINE_RETURN':
                return ['/stock-tontine/return'];
            case 'INVENTORY':
                return ['/inventory/history', movement.referenceId];
            default:
                return null;
        }
    }

    getReferenceQueryParams(movement: ArticleHistoryItem): Params | null {
        if (!movement.referenceId) {
            return null;
        }
        switch (movement.referenceType) {
            case 'STOCK_REQUEST':
            case 'STOCK_RETURN':
            case 'STOCK_TONTINE_REQUEST':
            case 'STOCK_TONTINE_RETURN':
                return { id: movement.referenceId };
            default:
                return null;
        }
    }

    openAllMovements(): void {
        this.dialog.open(MovementListDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            panelClass: 'movement-list-dialog',
            data: {
                movements: this.movements,
                articleName: this.articleName
            }
        });
    }
}
