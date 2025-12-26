import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, distinctUntilChanged } from 'rxjs/operators';

import { Client } from '../../../models/client.model';
import { Article } from '../../../models/article.model';

export interface TransactionConfig {
  type: 'DISTRIBUTION' | 'ORDER';
  checkStock: boolean;
  updateStock: boolean;
  showStockInfo: boolean;
  maxQuantityCheck: boolean;
  requiresAdvance: boolean;
  calculateDailyPayment: boolean;
  title: string;
  submitButtonText: string;
  backRoute: string;
}

export interface TransactionData {
  clientId: string;
  articles: Array<{ articleId: string; quantity: number }>;
  totalAmount: number;
  advance?: number;
  dailyPayment?: number;
  client?: Client;
}

@Component({
  selector: 'app-base-transaction',
  templateUrl: './base-transaction.component.html',
  styleUrls: ['./base-transaction.component.scss'],
  standalone: false
})
export class BaseTransactionComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  @Input() config: TransactionConfig = {
    type: 'ORDER',
    checkStock: false,
    updateStock: false,
    showStockInfo: false,
    maxQuantityCheck: false,
    requiresAdvance: false,
    calculateDailyPayment: false,
    title: 'Nouvelle Transaction',
    submitButtonText: 'CRÉER',
    backRoute: '/tabs/dashboard'
  };

  @Input() availableArticles: Article[] = [];
  @Input() selectedClient: Client | null = null;
  @Input() initialData: { articles: Array<{ articleId: string; quantity: number }>; totalAmount?: number; advance?: number } | null = null;

  @Output() clientSelect = new EventEmitter<void>();
  @Output() submit = new EventEmitter<TransactionData>();

  // Form
  transactionForm: FormGroup;

  // Reactive properties for calculation
  dailyPayment$ = new BehaviorSubject<number>(0);
  adjustedAdvance$ = new BehaviorSubject<number>(0);
  paymentPeriod$ = new BehaviorSubject<number>(30);
  isSpecialCase$ = new BehaviorSubject<boolean>(false);

  // Search functionality
  private searchTerm$ = new BehaviorSubject<string>('');
  filteredArticles: Article[] = [];

  // Local state
  articleQuantities: { [key: string]: number } = {};
  totalAmount = 0;

  constructor(private fb: FormBuilder) {
    this.transactionForm = this.fb.group({
      advance: [0]
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.setupFilteredArticles();
    this.setupCalculationPipeline();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['availableArticles'] && this.availableArticles) {
      this.setupFilteredArticles();
    }
    
    if (changes['initialData'] && this.initialData) {
      this.loadInitialData();
    }
  }

  private loadInitialData() {
    if (!this.initialData) return;
    
    // Charger les quantités initiales
    this.articleQuantities = {};
    this.initialData.articles.forEach(item => {
      this.articleQuantities[item.articleId] = item.quantity;
    });
    
    // Charger l'avance initiale si présente
    if (this.initialData.advance && this.config.requiresAdvance) {
      this.transactionForm.patchValue({ advance: this.initialData.advance });
    }
    
    // Recalculer le montant total
    this.calculateTotalAmount();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    if (!this.config.requiresAdvance) {
      this.transactionForm.removeControl('advance');
    }
  }

  private setupCalculationPipeline() {
    if (!this.config.calculateDailyPayment) return;

    const advanceControl = this.transactionForm.get('advance');
    if (!advanceControl) return;

    const advance$ = advanceControl.valueChanges.pipe(
      startWith(advanceControl.value || 0),
      map(value => Number(value) || 0),
      distinctUntilChanged()
    );

    combineLatest([
      new BehaviorSubject(this.totalAmount).pipe(distinctUntilChanged()),
      advance$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([totalAmount, advance]) => {
        if (totalAmount <= 0) {
          return { dailyPayment: 0, adjustedAdvance: advance, paymentPeriod: 30, isSpecialCase: false };
        }

        const remainingAmount = totalAmount - advance;
        if (remainingAmount <= 0) {
          return { dailyPayment: 0, adjustedAdvance: totalAmount, paymentPeriod: 0, isSpecialCase: true };
        }

        const rawDailyPaymentOn30Days = remainingAmount / 30;

        if (rawDailyPaymentOn30Days < 200 && remainingAmount > 0) {
          const dailyPayment = 200;
          const paymentPeriod = Math.floor(remainingAmount / dailyPayment);
          const totalPlannedPayments = paymentPeriod * dailyPayment;
          const adjustment = remainingAmount - totalPlannedPayments;
          const finalAdvance = advance + adjustment;

          return {
            dailyPayment,
            adjustedAdvance: finalAdvance,
            paymentPeriod,
            isSpecialCase: true
          };
        } else {
          const baseDailyPayment = Math.ceil(rawDailyPaymentOn30Days / 50) * 50;
          const totalPlannedPayments = baseDailyPayment * 30;
          const adjustment = remainingAmount - totalPlannedPayments;
          const finalAdvance = advance + adjustment;
          return {
            dailyPayment: baseDailyPayment,
            adjustedAdvance: finalAdvance,
            paymentPeriod: 30,
            isSpecialCase: false
          };
        }
      })
    ).subscribe(({ dailyPayment, adjustedAdvance, paymentPeriod, isSpecialCase }) => {
      this.dailyPayment$.next(dailyPayment);
      this.adjustedAdvance$.next(adjustedAdvance);
      this.paymentPeriod$.next(paymentPeriod);
      this.isSpecialCase$.next(isSpecialCase);

      const advanceControl = this.transactionForm.get('advance');
      if (advanceControl && advanceControl.value !== adjustedAdvance) {
        advanceControl.setValue(adjustedAdvance, { emitEvent: false });
      }
    });
  }

  private setupFilteredArticles() {
    combineLatest([
      new BehaviorSubject(this.availableArticles).pipe(distinctUntilChanged()),
      new BehaviorSubject(this.articleQuantities).pipe(distinctUntilChanged()),
      this.searchTerm$.pipe(distinctUntilChanged())
    ]).pipe(
      takeUntil(this.destroy$),
      map(([availableArticles, articleQuantities, searchTerm]) => {
        const selectedArticleIds = Object.keys(articleQuantities).filter(id => articleQuantities[id] > 0);
        const selectedArticles = availableArticles.filter(article => selectedArticleIds.includes(article.id));

        if (!searchTerm.trim()) {
          let unselectedArticles = availableArticles.filter(article => !selectedArticleIds.includes(article.id));
          
          // Filtrer selon la configuration
          if (this.config.checkStock) {
            unselectedArticles = unselectedArticles.filter(article => article.stockQuantity > 0);
          }
          
          unselectedArticles = unselectedArticles.slice(0, 10);

          const articlesMap = new Map<string, Article>();
          unselectedArticles.forEach(article => articlesMap.set(article.id, article));
          selectedArticles.forEach(article => articlesMap.set(article.id, article));

          return Array.from(articlesMap.values());
        } else {
          const searchTermLower = searchTerm.toLowerCase();
          let matchingArticles = availableArticles.filter(article =>
            article.name.toLowerCase().includes(searchTermLower) ||
            article.commercialName?.toLowerCase().includes(searchTermLower) ||
            article.reference?.toLowerCase().includes(searchTermLower)
          );

          if (this.config.checkStock) {
            matchingArticles = matchingArticles.filter(article => article.stockQuantity > 0);
          }

          const articlesMap = new Map<string, Article>();
          matchingArticles.forEach(article => articlesMap.set(article.id, article));
          selectedArticles
            .filter(article => !matchingArticles.some(match => match.id === article.id))
            .forEach(article => articlesMap.set(article.id, article));

          return Array.from(articlesMap.values());
        }
      })
    ).subscribe(filteredArticles => {
      this.filteredArticles = filteredArticles;
    });
  }

  onSearchInput(event: any) {
    const searchTerm = event.target.value || '';
    this.searchTerm$.next(searchTerm);
  }

  openClientSelector() {
    this.clientSelect.emit();
  }

  getAvatarColor(firstName: string): string {
    const colors = [
      '#FF6B35', '#2E8B57', '#4682B4', '#8B4513', '#9932CC',
      '#DC143C', '#008B8B', '#B8860B', '#8B008B', '#556B2F'
    ];
    const index = firstName ? firstName.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }

  getArticleQuantity(articleId: string): number {
    return this.articleQuantities[articleId] || 0;
  }

  getArticleTotal(articleId: string): number {
    const article = this.availableArticles.find(a => a.id === articleId);
    const quantity = this.getArticleQuantity(articleId);
    return article ? article.creditSalePrice * quantity : 0;
  }

  increaseQuantity(article: Article) {
    const currentQuantity = this.getArticleQuantity(article.id);
    const maxQuantity = this.config.maxQuantityCheck ? article.stockQuantity : Number.MAX_SAFE_INTEGER;
    
    if (currentQuantity < maxQuantity) {
      this.articleQuantities[article.id] = currentQuantity + 1;
      this.calculateTotalAmount();
    }
  }

  decreaseQuantity(article: Article) {
    const currentQuantity = this.getArticleQuantity(article.id);
    if (currentQuantity > 0) {
      this.articleQuantities[article.id] = currentQuantity - 1;
      if (this.articleQuantities[article.id] === 0) {
        delete this.articleQuantities[article.id];
      }
      this.calculateTotalAmount();
    }
  }

  onQuantityChange(articleId: string, event: any) {
    const quantity = parseInt(event.target.value, 10) || 0;
    const article = this.availableArticles.find(a => a.id === articleId);
    const maxQuantity = this.config.maxQuantityCheck && article ? article.stockQuantity : Number.MAX_SAFE_INTEGER;
    const validQuantity = Math.min(Math.max(0, quantity), maxQuantity);

    if (validQuantity === 0) {
      delete this.articleQuantities[articleId];
    } else {
      this.articleQuantities[articleId] = validQuantity;
    }
    this.calculateTotalAmount();
  }

  private calculateTotalAmount() {
    this.totalAmount = Object.entries(this.articleQuantities).reduce((sum, [articleId, quantity]) => {
      const article = this.availableArticles.find(a => a.id === articleId);
      return sum + (article ? article.creditSalePrice * quantity : 0);
    }, 0);
  }

  canValidate(): boolean {
    return this.selectedClient !== null && this.hasSelectedArticles();
  }

  hasSelectedArticles(): boolean {
    return Object.values(this.articleQuantities).some(qty => qty > 0);
  }

  getSelectedArticlesCount(): number {
    return Object.values(this.articleQuantities).filter(qty => qty > 0).length;
  }

  validateTransaction() {
    if (this.canValidate()) {
      const transactionData: TransactionData = {
        clientId: this.selectedClient!.id,
        articles: Object.entries(this.articleQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([articleId, quantity]) => ({ articleId, quantity })),
        totalAmount: this.totalAmount,
        client: this.selectedClient!
      };

      if (this.config.requiresAdvance) {
        transactionData.advance = this.adjustedAdvance$.value;
      }

      if (this.config.calculateDailyPayment) {
        transactionData.dailyPayment = this.dailyPayment$.value;
      }

      this.submit.emit(transactionData);
    }
  }
}