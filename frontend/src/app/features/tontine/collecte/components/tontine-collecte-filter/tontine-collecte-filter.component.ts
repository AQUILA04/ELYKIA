import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-tontine-collecte-filter',
  templateUrl: './tontine-collecte-filter.component.html',
  styleUrls: ['./tontine-collecte-filter.component.scss'],
  standalone: false
})
export class TontineCollecteFilterComponent implements OnInit {
  @Input() isCommercialLogue: boolean = false;
  @Input() currentCollector: string = 'all';
  
  @Output() commercialChanged = new EventEmitter<string>();
  @Output() periodDateChanged = new EventEmitter<{from: string, to: string}>();

  activeFilterParams: any = { dateFrom: '', dateTo: '' };
  activePeriod: string = 'today';
  showCustomDateFilter: boolean = false;

  customDateRange = {
    start: '',
    end: ''
  };

  today: string = new Date().toISOString().split('T')[0];

  ngOnInit() {
    this.selectPeriod('today');
  }

  onCommercialSelected(collector: string | null) {
    this.commercialChanged.emit(collector || 'all');
  }

  selectPeriod(period: string) {
    this.activePeriod = period;
    this.showCustomDateFilter = (period === 'custom');

    if (period !== 'custom') {
      const dates = this.calculateDatesForPeriod(period);
      this.activeFilterParams.dateFrom = dates.from;
      this.activeFilterParams.dateTo = dates.to;
      this.emitPeriodChange();
    }
  }

  applyCustomDateRange() {
    if (this.customDateRange.start && this.customDateRange.end) {
      // Les dates venant de input type="date" sont déjà au format YYYY-MM-DD
      this.activeFilterParams.dateFrom = this.customDateRange.start;
      this.activeFilterParams.dateTo = this.customDateRange.end;
      this.emitPeriodChange();
    }
  }

  private emitPeriodChange() {
    this.periodDateChanged.emit({
      from: this.activeFilterParams.dateFrom,
      to: this.activeFilterParams.dateTo
    });
  }

  private calculateDatesForPeriod(period: string): {from: string, to: string} {
    const today = new Date();
    
    // Fonction utilitaire pour le format YYYY-MM-DD local
    const formatDate = (date: Date): string => {
        // En ajustant le fuseau horaire local
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    switch (period) {
        case 'today':
            return {
                from: formatDate(today),
                to: formatDate(today)
            };
        case 'week':
            const firstDayOfWeek = new Date(today);
            const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
            // Ajuster pour que la semaine commence lundi (si ce n'est pas le comportement par défaut souhaité, ajuster ce calcul)
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            firstDayOfWeek.setDate(diff);
            
            return {
                from: formatDate(firstDayOfWeek),
                to: formatDate(today)
            };
        case 'month':
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            return {
                from: formatDate(firstDayOfMonth),
                to: formatDate(today)
            };
        default:
            return {
                from: formatDate(today),
                to: formatDate(today)
            };
    }
  }
}
