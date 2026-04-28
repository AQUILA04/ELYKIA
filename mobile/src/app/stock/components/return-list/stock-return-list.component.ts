import { Component, Input } from '@angular/core';
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
