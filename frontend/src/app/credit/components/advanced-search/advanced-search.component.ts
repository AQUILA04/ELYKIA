import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, OnInit, Output, EventEmitter, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  CreditSearchDto,
  ClientType,
  OperationType,
  CreditStatus,
  CLIENT_TYPE_OPTIONS,
  OPERATION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  SearchOption
} from './advanced-search.types';

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss'],
  animations: [
    trigger('slideDown', [
      state('void', style({
        transform: 'translateY(-5%)',
        opacity: 0
      })),
      state('*', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition('void => *', animate('300ms ease-out')),
      transition('* => void', animate('300ms ease-in'))
    ])
  ]
})
export class AdvancedSearchComponent implements OnInit, OnDestroy, OnChanges {
  @Input() commercials: any[] = [];
  @Input() isVisible: boolean = false;
  @Input() initialSearchDto: CreditSearchDto | null = null;
  @Input() isPromoter: boolean = false;
  @Input() currentUsername: string | null = null;

  @Output() search = new EventEmitter<CreditSearchDto>();
  @Output() close = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  searchForm!: FormGroup;

  // Options pour les dropdowns
  clientTypeOptions = CLIENT_TYPE_OPTIONS;
  operationTypeOptions = OPERATION_TYPE_OPTIONS;
  statusOptions = STATUS_OPTIONS;

  private subscriptions: Subscription[] = [];
  activeFiltersCount: number = 0;

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
    // Re-apply promoter restrictions if inputs change
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
    // Mettre à jour le compteur de filtres à chaque changement
    const sub = this.searchForm.valueChanges.subscribe(() => {
      this.calculateActiveFilters();
    });
    this.subscriptions.push(sub);
  }

  onSearch(): void {
    // Use getRawValue to include disabled fields (like commercial for promoter)
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

    // Re-apply promoter restriction after reset
    this.applyPromoterRestrictions();

    this.activeFiltersCount = 0;
    this.calculateActiveFilters();

    this.reset.emit();
  }

  onClose(): void {
    this.close.emit();
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
  }

  searchCommercial = (term: string, item: any) => {
    if (!term || !item) return false;
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    const username = (item.username || '').toLowerCase();
    return fullName.includes(term) || username.includes(term);
  }

  hasActiveFilters(): boolean {
    return this.activeFiltersCount > 0;
  }
}
