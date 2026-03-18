import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-credit-late-filter',
  templateUrl: './credit-late-filter.component.html',
  styleUrls: ['./credit-late-filter.component.scss'],
  standalone: false
})
export class CreditLateFilterComponent {
  @Output() typeChanged = new EventEmitter<string>();
  @Output() commercialChanged = new EventEmitter<string>();

  currentType: string = 'all';

  @Input() resultCount: number = 0;

  setTypeFilter(type: string) {
    this.currentType = type;
    this.typeChanged.emit(type);
  }

  onCommercialSelected(commercial: string | null) {
    this.commercialChanged.emit(commercial || '');
  }
}
