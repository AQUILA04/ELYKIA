import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CreditLateService } from '../../../service/credit-late.service';

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
  @Output() localityChanged = new EventEmitter<string>();

  @Input() currentType: string = 'all';
  @Input() currentMonth: number | null = null;
  @Input() currentLocality: string = 'all';
  
  months: { index: number; name: string }[] = [];

  localities: any[] = [];
  localityPage: number = 0;
  localityLoading: boolean = false;
  localitySearchKeyword: string = '';
  localityTotalPages: number = 0;
  localitySearchInput$ = new Subject<string>();

  @Input() resultCount: number = 0;
  @Input() isDownloading: boolean = false;

  constructor(private creditLateService: CreditLateService) {}

  ngOnInit() {
    this.generateMonths();
    this.loadLocalities();

    this.localitySearchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(keyword => {
      this.localitySearchKeyword = keyword;
      this.localityPage = 0;
      this.localities = [];
      this.loadLocalities();
    });
  }

  loadLocalities() {
    this.localityLoading = true;
    this.creditLateService.searchLocalities(this.localitySearchKeyword, this.localityPage, 20).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          const newItems = res.data.content || [];
          this.localities = [...this.localities, ...newItems];
          this.localityTotalPages = res.data.totalPages || 0;
        }
        this.localityLoading = false;
      },
      error: () => {
        this.localityLoading = false;
      }
    });
  }

  onLocalitySearch(event: { term: string }) {
    this.localitySearchInput$.next(event.term);
  }

  onLocalityScrollToEnd() {
    if (this.localityPage < this.localityTotalPages - 1 && !this.localityLoading) {
      this.localityPage++;
      this.loadLocalities();
    }
  }

  onLocalitySelected(event: any) {
    this.currentLocality = event ? event.name : 'all';
    this.localityChanged.emit(this.currentLocality);
  }

  generateMonths() {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const currentMonthIndex = new Date().getMonth();

    for (let i = 0; i <= currentMonthIndex; i++) {
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
