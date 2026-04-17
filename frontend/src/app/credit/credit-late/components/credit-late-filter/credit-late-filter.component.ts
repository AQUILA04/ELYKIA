import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-credit-late-filter',
  templateUrl: './credit-late-filter.component.html',
  styleUrls: ['./credit-late-filter.component.scss'],
  standalone: false
})
export class CreditLateFilterComponent implements OnInit {
  @Output() typeChanged = new EventEmitter<string>();
  @Output() commercialChanged = new EventEmitter<string>();
  @Output() monthChanged = new EventEmitter<number | null>();
  @Output() downloadClicked = new EventEmitter<void>();

  currentType: string = 'all';
  currentMonth: number | null = null;
  months: { index: number; name: string }[] = [];

  @Input() resultCount: number = 0;
  @Input() isDownloading: boolean = false;

  ngOnInit() {
    this.generateMonths();
  }

  generateMonths() {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const currentMonthIndex = new Date().getMonth();
    
    for (let i = 0; i < currentMonthIndex; i++) {
        this.months.push({ index: i + 1, name: monthNames[i] });
    }
  }

  setTypeFilter(type: string) {
    this.currentType = type;
    this.typeChanged.emit(type);
  }

  onCommercialSelected(commercial: string | null) {
    this.commercialChanged.emit(commercial || '');
  }

  onMonthSelected(event: any) {
    const value = event.target ? event.target.value : event;
    this.currentMonth = value && value !== 'all' ? Number(value) : null;
    this.monthChanged.emit(this.currentMonth);
  }

  onDownload() {
    this.downloadClicked.emit();
  }
}
