import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  CreditSearchDto,
  CLIENT_TYPE_OPTIONS,
  OPERATION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  SearchOption,
} from './advanced-search.types';

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideDown', [
      state('void', style({ opacity: 0, maxHeight: '0px', overflow: 'hidden' })),
      state('*', style({ opacity: 1, maxHeight: '600px', overflow: 'hidden' })),
      transition('void => *', animate('250ms ease-out')),
      transition('* => void', animate('200ms ease-in'))
    ])
  ],
  standalone: false
})
export class AdvancedSearchComponent implements OnInit, OnDestroy, OnChanges {
  @Input() commercials: any[] = [];
  @Input() isVisible = false;
  @Input() initialSearchDto: CreditSearchDto | null = null;
  @Input() isPromoter = false;
  @Input() currentUsername: string | null = null;

  @Output() search = new EventEmitter<CreditSearchDto>();
  @Output() close = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() activeFiltersCountChange = new EventEmitter<number>();

  searchForm!: FormGroup;

  clientTypeOptions = CLIENT_TYPE_OPTIONS;
  operationTypeOptions = OPERATION_TYPE_OPTIONS;
  statusOptions = STATUS_OPTIONS;

  readonly clientTypeMinWidth = this.minWidthForOptions(this.clientTypeOptions);
  readonly operationTypeMinWidth = this.minWidthForOptions(this.operationTypeOptions);
  readonly statusMinWidth = this.minWidthForOptions(this.statusOptions);

  private subscriptions: Subscription[] = [];
  activeFiltersCount = 0;

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit(): void {
    this.setupFilterCounter();
    this.initFormValues();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSearchDto'] && !changes['initialSearchDto'].firstChange) {
      if (this.initialSearchDto) {
        this.searchForm.patchValue(this.initialSearchDto);
      }
    }
    if (changes['isPromoter'] || changes['currentUsername']) {
      this.applyPromoterRestrictions();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  private initForm(): void {
    this.searchForm = this.fb.group({
      keyword: [''],
      clientType: [null],
      type: [null],
      status: [null],
      commercial: [null]
    });
  }

  private initFormValues(): void {
    if (this.initialSearchDto) {
      this.searchForm.patchValue(this.initialSearchDto);
    }
    this.applyPromoterRestrictions();
    this.calculateActiveFilters();
  }

  private applyPromoterRestrictions(): void {
    if (this.isPromoter && this.currentUsername) {
      this.searchForm.patchValue({ commercial: this.currentUsername });
      this.searchForm.get('commercial')?.disable();
    }
  }

  private setupFilterCounter(): void {
    const sub = this.searchForm.valueChanges.subscribe(() => {
      this.calculateActiveFilters();
    });
    this.subscriptions.push(sub);
  }

  onSearch(): void {
    const formValue = this.searchForm.getRawValue();

    if (!this.hasActiveFilters()) {
      return;
    }

    const searchDto: CreditSearchDto = {
      keyword: formValue.keyword || undefined,
      clientType: formValue.clientType || null,
      type: formValue.type || null,
      status: formValue.status || null,
      commercial: formValue.commercial || null
    };

    this.search.emit(searchDto);
  }

  onReset(): void {
    this.searchForm.reset({
      keyword: '',
      clientType: null,
      type: null,
      status: null,
      commercial: null
    });

    this.applyPromoterRestrictions();
    this.activeFiltersCount = 0;
    this.calculateActiveFilters();
    this.reset.emit();
  }

  private calculateActiveFilters(): void {
    const formValue = this.searchForm.getRawValue();
    let count = 0;

    if (formValue.keyword && formValue.keyword.trim()) count++;
    if (formValue.clientType) count++;
    if (formValue.type) count++;
    if (formValue.status) count++;
    if (formValue.commercial) count++;

    this.activeFiltersCount = count;
    this.activeFiltersCountChange.emit(count);
  }

  searchCommercial = (term: string, item: any) => {
    if (!term || !item) return false;
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    const username = (item.username || '').toLowerCase();
    return fullName.includes(term) || username.includes(term);
  };

  hasActiveFilters(): boolean {
    return this.activeFiltersCount > 0;
  }

  commercialMinWidth(): number {
    const labels = this.commercials.map(
      (c) => `${c.firstname ?? ''} ${c.lastname ?? ''}`.trim()
    );
    return this.minWidthForLabels(['Tous', ...labels]);
  }

  minWidthForOptions(options: SearchOption[]): number {
    return this.minWidthForLabels(options.map((o) => o.label));
  }

  /** Largeur minimale basée sur le libellé le plus long (+ place pour flèche / clear). */
  minWidthForLabels(labels: string[]): number {
    const longest = labels.reduce((max, label) => Math.max(max, (label || '').length), 0);
    return Math.min(Math.max(Math.round(longest * 8.5) + 72, 180), 420);
  }
}
