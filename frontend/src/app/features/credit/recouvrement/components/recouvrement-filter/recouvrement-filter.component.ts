import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-recouvrement-filter',
  templateUrl: './recouvrement-filter.component.html',
  styleUrls: ['./recouvrement-filter.component.scss'],
  standalone: false
})
export class RecouvrementFilterComponent implements OnInit {
  @Input() resultCount: number = 0;
  @Input() isCommercialLogue: boolean = false;
  @Input() currentCollector: string = 'all';
  
  @Output() dateChanged = new EventEmitter<{from: string, to: string}>();
  @Output() commercialChanged = new EventEmitter<string>();

  periodOptions = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois', value: 'month' },
    { label: 'Personnalisé', value: 'custom' },
  ];
  
  selectedPeriod: string = 'today';
  
  customDateFrom: string = '';
  customDateTo: string = '';

  today: string = new Date().toISOString().split('T')[0];

  ngOnInit() {
    this.selectPeriod('today');
  }

  onCommercialSelected(collector: string | null) {
    this.commercialChanged.emit(collector || 'all');
  }

  selectPeriod(period: string) {
    this.selectedPeriod = period;
    
    const today = new Date();
    let from = new Date();
    let to = new Date();

    if (period === 'today') {
      // nothing changes
    } else if (period === 'week') {
      const first = today.getDate() - today.getDay() + 1;
      from = new Date(today.setDate(first));
      to = new Date(today.setDate(first + 6));
    } else if (period === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'custom') {
      return; // Do nothing until they pick dates
    }

    this.customDateFrom = from.toISOString().split('T')[0];
    this.customDateTo = to.toISOString().split('T')[0];
    
    this.emitDates();
  }

  applyCustomDates() {
    if (this.customDateFrom && this.customDateTo) {
      this.emitDates();
    }
  }

  private emitDates() {
    this.dateChanged.emit({
      from: this.customDateFrom,
      to: this.customDateTo
    });
  }
}
