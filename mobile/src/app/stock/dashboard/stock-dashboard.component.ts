import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SegmentCustomEvent } from '@ionic/angular';
import { StockStateService, OperationalContext } from '../services/stock-state.service';

@Component({
  selector: 'app-stock-dashboard',
  templateUrl: './stock-dashboard.component.html',
  styleUrls: ['./stock-dashboard.component.scss'],
  standalone: false
})
export class StockDashboardComponent implements OnInit {
  /** Observable of the current operational context, consumed via async pipe in template. */
  context$: Observable<OperationalContext>;

  constructor(private stockStateService: StockStateService) {
    this.context$ = this.stockStateService.context$;
  }

  ngOnInit(): void {
    // Reset to predictable default state whenever the dashboard is loaded
    this.stockStateService.setContext('STANDARD');
  }

  /**
   * Handles Ionic segment ionChange events.
   * Updates StockStateService with the newly selected context.
   */
  onContextChange(event: any): void {
    const customEvent = event as SegmentCustomEvent;
    if (customEvent.detail.value) {
      const value = customEvent.detail.value as OperationalContext;
      this.stockStateService.setContext(value);
    }
  }
}

