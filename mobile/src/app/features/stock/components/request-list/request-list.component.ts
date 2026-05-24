import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StockRequest } from '../../models/stock-request.model';

@Component({
  selector: 'app-request-list',
  templateUrl: './request-list.component.html',
  styleUrls: ['./request-list.component.scss'],
  standalone: false
})
export class RequestListComponent {
  @Input() context: 'STANDARD' | 'TONTINE' = 'STANDARD';
  @Input() requests: StockRequest[] = [];
  @Input() loading: boolean = false;
  @Input() cancellingId: number | null = null;
  @Output() operationTap = new EventEmitter<StockRequest>();
  @Output() cancelTap = new EventEmitter<StockRequest>();

  onOperationTap(request: StockRequest): void {
    this.operationTap.emit(request);
  }

  onCancelTap(event: Event, request: StockRequest): void {
    event.stopPropagation(); // prevent triggering operationTap
    this.cancelTap.emit(request);
  }

  isCancellable(status: string | null | undefined): boolean {
    return status === 'CREATED' || status === 'PENDING';
  }

  /**
   * Returns the CSS modifier class for a request status badge.
   * Handles null/undefined status safely to avoid 'status-null' CSS classes.
   */
  getBadgeClass(status: string | null | undefined): string {
    if (!status) return 'status-pending';
    return `status-${status.toLowerCase()}`;
  }

  /** trackBy function for ngFor — prevents full DOM re-render on data refresh. */
  trackById(_index: number, request: StockRequest): number {
    return request.id;
  }

  /**
   * Returns a French label for a status code (maquette: EN ATTENTE / VALIDÉE / LIVRÉE).
   * Falls back to the raw status string if not recognised.
   */
  getStatusLabel(status: string | null | undefined): string {
    if (!status) return 'EN ATTENTE';
    const map: Record<string, string> = {
      CREATED:   'EN ATTENTE',
      PENDING:   'EN ATTENTE',
      VALIDATED: 'VALIDÉE',
      APPROVED:  'VALIDÉE',
      DELIVERED: 'LIVRÉE',
      REFUSED:   'REFUSÉE',
      CANCELLED: 'ANNULÉE',
    };
    return map[status.toUpperCase()] ?? status.toUpperCase();
  }
}
