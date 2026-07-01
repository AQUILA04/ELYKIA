import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, forwardRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ItemService } from 'src/app/article/service/item.service';

export interface ArticleSelection {
  articleId: number;
  quantity: number;
  unitPrice?: number;
}

export type PriceType = 'credit' | 'tontine' | 'inventory';

@Component({
  selector: 'app-article-selector',
  templateUrl: './article-selector.component.html',
  styleUrls: ['./article-selector.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ArticleSelectorComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ArticleSelectorComponent),
      multi: true
    }
  ]
})
export class ArticleSelectorComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor, Validator {
  @Input() articles: any[] = [];
  @Input() lazyLoad = false;
  @Input() enabledOnly = true;
  @Input() readonly: boolean = false;
  @Input() priceType: PriceType = 'credit';
  @Input() showPrices: boolean = true;
  @Input() showStock: boolean = true;
  @Input() validateStock: boolean = false;
  @Input() capturePurchasePrice: boolean = false;
  @Output() articlesChange = new EventEmitter<ArticleSelection[]>();
  @Output() totalAmountChange = new EventEmitter<number>();

  articleForm!: FormGroup;
  availableArticlesPerRow: any[][] = [];
  totalAmount: number = 0;
  articlesLoading = false;

  private readonly pageSize = 20;
  private articlesPage = 0;
  private articlesTotalPages = 0;
  private articlesSearchTerm = '';
  private articlesSearch$ = new Subject<string>();
  private articleIndex = new Map<number, any>();
  private articlesSub?: Subscription;
  private lazySearchSub?: Subscription;
  private loadArticlesSub?: Subscription;
  private rowSubs: Subscription[] = [];

  // ControlValueAccessor
  private onChange: (value: ArticleSelection[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor(
    private fb: FormBuilder,
    private itemService: ItemService
  ) {
    this.articleForm = this.fb.group({
      articles: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.articlesArray.length === 0) {
      this.addArticle();
    }

    if (this.lazyLoad) {
      this.setupLazyArticlesLoading();
      this.loadArticlesPage();
    } else {
      this.indexArticles(this.articles);
      this.updateAvailableArticleLists();
    }

    this.listenForArticleChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articles'] && !this.lazyLoad) {
      this.indexArticles(this.articles);
      this.updateAvailableArticleLists();
      if (this.showPrices) {
        this.calculateTotalAmount();
      }
    }
    if (changes['priceType'] || changes['showPrices']) {
      if (this.showPrices) {
        this.calculateTotalAmount();
      }
    }
  }

  ngOnDestroy(): void {
    this.articlesSub?.unsubscribe();
    this.lazySearchSub?.unsubscribe();
    this.loadArticlesSub?.unsubscribe();
    this.clearRowSubs();
  }

  getArticle(id: number): any | undefined {
    return this.articleIndex.get(id) ?? this.articles.find(a => a.id === id);
  }

  onArticlesScrollToEnd(): void {
    if (!this.lazyLoad || this.articlesLoading) {
      return;
    }
    if (this.articlesPage < this.articlesTotalPages - 1) {
      this.articlesPage++;
      this.loadArticlesPage();
    }
  }

  onArticlesSearch(event: { term: string }): void {
    if (!this.lazyLoad) {
      return;
    }
    this.articlesSearch$.next(event.term ?? '');
  }

  get articlesArray(): FormArray {
    return this.articleForm.get('articles') as FormArray;
  }

  createArticle(): FormGroup {
    if (this.capturePurchasePrice) {
      const group = this.fb.group({
        articleId: [null, Validators.required],
        quantity: ['', [Validators.required, Validators.min(1)]],
        unitPrice: [null, [Validators.required, Validators.min(0.01)]]
      });
      this.attachPurchasePriceSync(group);
      return group;
    }

    return this.fb.group({
      articleId: [null, Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]]
    });
  }

  addArticle(): void {
    if (this.readonly) return;

    this.articlesArray.push(this.createArticle());
    this.updateAvailableArticleLists();
    this.listenForArticleChanges();
    this.emitChanges();
  }

  deleteArticle(index: number): void {
    if (this.readonly) return;

    this.rowSubs[index]?.unsubscribe();
    this.rowSubs.splice(index, 1);
    this.articlesArray.removeAt(index);
    this.updateAvailableArticleLists();
    this.listenForArticleChanges();
    this.emitChanges();
  }

  private setupLazyArticlesLoading(): void {
    this.lazySearchSub = this.articlesSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.loadArticlesSub?.unsubscribe();
      this.articlesLoading = false;
      this.articlesSearchTerm = term;
      this.resetLazyArticles();
      this.loadArticlesPage();
    });
  }

  private resetLazyArticles(): void {
    this.articlesPage = 0;
    const selectedArticles = this.snapshotSelectedArticles();
    this.articleIndex.clear();
    this.articles = selectedArticles;
    this.indexArticles(selectedArticles);
  }

  private snapshotSelectedArticles(): any[] {
    const selectedIds = this.articlesArray.controls
      .map(control => control.get('articleId')?.value)
      .filter((id): id is number => id != null);

    const seen = new Set<number>();
    const selectedArticles: any[] = [];
    for (const id of selectedIds) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      const article = this.articleIndex.get(id) ?? this.articles.find(item => item.id === id);
      if (article) {
        selectedArticles.push(article);
      }
    }
    return selectedArticles;
  }

  private collectSelectedArticles(): any[] {
    return this.snapshotSelectedArticles();
  }

  private attachPurchasePriceSync(group: FormGroup): void {
    const sub = group.get('articleId')?.valueChanges.subscribe(articleId => {
      if (articleId == null) {
        return;
      }
      const article = this.getArticle(articleId);
      if (article) {
        group.patchValue({ unitPrice: article.purchasePrice ?? 0 }, { emitEvent: false });
      }
    });
    if (sub) {
      this.rowSubs.push(sub);
    }
  }

  private clearRowSubs(): void {
    this.rowSubs.forEach(sub => sub.unsubscribe());
    this.rowSubs = [];
  }

  private loadArticlesPage(): void {
    if (this.articlesLoading) {
      return;
    }

    this.articlesLoading = true;
    const request$ = this.enabledOnly
      ? this.itemService.getEnabledArticlesPage(this.articlesPage, this.pageSize, 'name,asc', this.articlesSearchTerm)
      : this.itemService.getArticles(this.articlesPage, this.pageSize, 'name,asc', this.articlesSearchTerm);

    this.loadArticlesSub?.unsubscribe();
    this.loadArticlesSub = request$.subscribe({
      next: (response: any) => {
        const newItems = response.data?.content || [];
        this.indexArticles(newItems);
        const existingIds = new Set(this.articles.map(article => article.id));
        this.articles = [
          ...this.articles,
          ...newItems.filter((article: any) => !existingIds.has(article.id))
        ];
        this.articlesTotalPages = response.data?.totalPages ?? 0;
        this.articlesLoading = false;
        this.updateAvailableArticleLists();
      },
      error: () => {
        this.articlesLoading = false;
      }
    });
  }

  private indexArticles(items: any[]): void {
    items.forEach(item => this.articleIndex.set(item.id, item));
  }

  private listenForArticleChanges(): void {
    this.articlesSub?.unsubscribe();

    this.articlesSub = this.articlesArray.valueChanges.subscribe(() => {
      this.updateAvailableArticleLists();
      if (this.showPrices) {
        this.calculateTotalAmount();
      }
      this.emitChanges();
    });
  }

  private updateAvailableArticleLists(): void {
    const allControls = this.articlesArray.controls;
    this.availableArticlesPerRow = allControls.map((_, currentIndex) => {
      const selectedIdsInOtherRows = new Set(allControls
        .filter((__, index) => index !== currentIndex)
        .map(control => control.get('articleId')?.value)
        .filter(id => id != null));

      return this.articles.filter(
        article => !selectedIdsInOtherRows.has(article.id)
      );
    });
  }

  private calculateTotalAmount(): void {
    let total = 0;

    this.articlesArray.controls.forEach(control => {
      const articleId = control.get('articleId')?.value;
      const quantity = control.get('quantity')?.value;

      if (articleId && quantity > 0) {
        const article = this.getArticle(articleId);
        if (article) {
          const price = this.getArticlePrice(articleId);
          total += price * quantity;
        }
      }
    });

    this.totalAmount = total;
    this.totalAmountChange.emit(this.totalAmount);
  }

  private emitChanges(): void {
    const value = this.articlesArray.value;
    this.onChange(value);
    this.onTouched();
    this.articlesChange.emit(value);
    this.onValidatorChange();
  }

  searchArticle = (term: string, item: any) => {
    if (!term) {
      return true;
    }
    term = term.toLowerCase();
    const label = (item.commercialName || item.name || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return label.includes(term) || name.includes(term);
  };

  alwaysPassSearch = () => true;

  getArticlePrice(articleId: number): number {
    const article = this.getArticle(articleId);
    if (!article) return 0;

    switch (this.priceType) {
      case 'tontine':
        return article.sellingPrice || 0;
      case 'credit':
        return article.creditSalePrice || 0;
      case 'inventory':
        return article.sellingPrice || 0;
      default:
        return article.sellingPrice || 0;
    }
  }

  getLineTotal(index: number): number {
    const control = this.articlesArray.at(index);
    const articleId = control.get('articleId')?.value;
    const quantity = control.get('quantity')?.value || 0;

    if (!articleId || quantity <= 0) return 0;

    return this.getArticlePrice(articleId) * quantity;
  }

  shouldShowPriceColumns(): boolean {
    return this.showPrices && !this.capturePurchasePrice;
  }

  shouldShowPurchasePriceColumn(): boolean {
    return this.capturePurchasePrice;
  }

  getCatalogPurchasePrice(articleId: number): number {
    const article = this.getArticle(articleId);
    return article?.purchasePrice ?? 0;
  }

  writeValue(value: ArticleSelection[]): void {
    if (value && Array.isArray(value)) {
      this.clearRowSubs();
      this.articlesArray.clear();
      value.forEach(article => {
        const groupConfig: Record<string, unknown> = {
          articleId: [article.articleId, Validators.required],
          quantity: [article.quantity, [Validators.required, Validators.min(1)]]
        };
        if (this.capturePurchasePrice) {
          groupConfig['unitPrice'] = [
            article.unitPrice ?? this.getCatalogPurchasePrice(article.articleId),
            [Validators.required, Validators.min(0.01)]
          ];
        }
        const group = this.fb.group(groupConfig);
        if (this.capturePurchasePrice) {
          this.attachPurchasePriceSync(group);
        }
        this.articlesArray.push(group);
      });
      this.updateAvailableArticleLists();
      if (this.showPrices) {
        this.calculateTotalAmount();
      }
      this.listenForArticleChanges();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.articleForm.disable();
    } else {
      this.articleForm.enable();
    }
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.articlesArray.length === 0) {
      return { required: true };
    }

    if (!this.articlesArray.valid) {
      return { invalid: true };
    }

    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  isStockExceeded(index: number): boolean {
    const control = this.articlesArray.at(index);
    const articleId = control.get('articleId')?.value;
    const quantity = control.get('quantity')?.value;

    if (!articleId || !quantity) return false;

    const stock = this.getArticleStock(articleId);
    return quantity > stock;
  }

  getArticleStock(articleId: number): number {
    const article = this.getArticle(articleId);
    return article?.stockQuantity || 0;
  }

  getStockClass(articleId: number): string {
    const stock = this.getArticleStock(articleId);

    if (stock === 0) return 'stock-empty';
    if (stock <= 5) return 'stock-low';
    if (stock <= 20) return 'stock-medium';
    return 'stock-good';
  }
}
