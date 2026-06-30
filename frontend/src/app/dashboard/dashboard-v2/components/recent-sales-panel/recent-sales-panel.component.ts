import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-recent-sales-panel',
  templateUrl: './recent-sales-panel.component.html',
  styleUrls: ['./recent-sales-panel.component.scss']
})
export class RecentSalesPanelComponent {
  @Input() sales: any[] = [];
  @Input() loading = false;

  getInitials(sale: any): string {
    const first = sale?.client?.firstname?.charAt(0) ?? '';
    const last = sale?.client?.lastname?.charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }
}
