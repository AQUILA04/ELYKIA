import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-credit-echeance-filter',
  templateUrl: './credit-echeance-filter.component.html',
  styleUrls: ['./credit-echeance-filter.component.scss'],
  standalone: false
})
export class CreditEcheanceFilterComponent {
  @Input() resultCount: number = 0;
  @Input() selectedPeriod: string = 'week';
  @Input() selectedDate: string = '';

  @Output() periodChanged = new EventEmitter<string>();
  @Output() dateChanged = new EventEmitter<string>();
  @Output() commercialChanged = new EventEmitter<string | null>();

  setPeriod(period: string) {
    this.periodChanged.emit(period);
  }

  onDateChange(value: string | null) {
    this.dateChanged.emit(value || '');
  }

  onCommercialSelected(collector: string | null) {
    this.commercialChanged.emit(collector);
  }
}
