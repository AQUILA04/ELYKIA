import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StockReturn } from '../../models/stock-return.model';

@Component({
  selector: 'app-stock-return-list',
  templateUrl: './stock-return-list.component.html',
  styleUrls: ['./stock-return-list.component.scss'],
  standalone: false
})
export class StockReturnListComponent {
  @Input() context: 'STANDARD' | 'TONTINE' = 'STANDARD';
  @Input() returns: StockReturn[] = [];
  @Input() loading: boolean = false;
  @Input() cancellingId: number | null = null;
  @Output() operationTap = new EventEmitter<StockReturn>();
  @Output() cancelTap = new EventEmitter<StockReturn>();

  onOperationTap(returnItem: StockReturn): void {
    this.operationTap.emit(returnItem);
  }

  onCancelTap(event: Event, returnItem: StockReturn): void {
    event.stopPropagation(); // prevent triggering operationTap
    this.cancelTap.emit(returnItem);
  }

  isCancellable(status: string | null | undefined): boolean {
    return status === 'CREATED' || status === 'PENDING';
  }

  /**
   * Returns the CSS modifier class for a return status badge.
   * Handles null/undefined status safely to avoid 'status-null' CSS classes.
   */
  getBadgeClass(status: string | null | undefined): string {
    if (!status) return 'status-pending';
    return `status-${status.toLowerCase()}`;
  }

  /** trackBy function for ngFor — prevents full DOM re-render on data refresh. */
  trackById(_index: number, returnItem: StockReturn): number {
    return returnItem.id;
  }
}
