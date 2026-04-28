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
  @Output() operationTap = new EventEmitter<StockRequest>();

  onOperationTap(request: StockRequest): void {
    this.operationTap.emit(request);
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
}
