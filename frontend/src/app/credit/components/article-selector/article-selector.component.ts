import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, forwardRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ItemService } from 'src/app/article/service/item.service';

export interface ArticleSelection {
  articleId: number;
  quantity?: number;
  unitPrice?: number;
  entryPackagingMode?: 'UNIT' | 'WHOLESALE' | 'HALF_WHOLESALE';
  packageCount?: number;
  packagePrice?: number;
}

export type PriceType = 'credit' | 'tontine' | 'inventory';
export type EntryPackagingMode = 'UNIT' | 'WHOLESALE' | 'HALF_WHOLESALE';

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
      this.ensureLazyArticlesLoading();
      this.loadArticlesPage();
    } else {
      this.indexArticles(this.articles);
      this.updateAvailableArticleLists();
    }

    this.listenForArticleChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lazyLoad']) {
      if (this.lazyLoad) {
        this.ensureLazyArticlesLoading();
        this.resetLazyArticles();
        this.loadArticlesPage();
      } else {
        this.teardownLazyArticlesLoading();
        this.indexArticles(this.articles);
        this.updateAvailableArticleLists();
        if (this.showPrices) {
          this.calculateTotalAmount();
        }
      }
    }

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
    this.teardownLazyArticlesLoading();
    this.articlesSub?.unsubscribe();
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
        entryPackagingMode: ['UNIT' as EntryPackagingMode],
        quantity: ['', [Validators.required, Validators.min(1)]],
        unitPrice: [null, [Validators.required, Validators.min(0.01)]],
        packageCount: [null],
        packagePrice: [null]
      });
      this.attachPurchasePriceSync(group);
      this.attachPackagingModeSync(group);
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

  private ensureLazyArticlesLoading(): void {
    if (!this.lazySearchSub) {
      this.setupLazyArticlesLoading();
    }
  }

  private teardownLazyArticlesLoading(): void {
    this.loadArticlesSub?.unsubscribe();
    this.lazySearchSub?.unsubscribe();
    this.lazySearchSub = undefined;
    this.articlesLoading = false;
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
        const hasPackaging = article.packagingType && article.packagingType !== 'NONE'
          && typeof article.unitsPerPackage === 'number' && article.unitsPerPackage >= 2;
        group.patchValue({
          unitPrice: article.purchasePrice ?? 0,
          entryPackagingMode: 'UNIT',
          packageCount: null,
          packagePrice: null
        }, { emitEvent: false });
        if (!hasPackaging) {
          group.get('entryPackagingMode')?.setValue('UNIT', { emitEvent: false });
        }
        this.applyPackagingModeValidators(group);
      }
    });
    if (sub) {
      this.rowSubs.push(sub);
    }
  }

  private attachPackagingModeSync(group: FormGroup): void {
    const sub = group.get('entryPackagingMode')?.valueChanges.subscribe(() => {
      this.prefillPackagePrice(group);
      this.applyPackagingModeValidators(group);
    });
    if (sub) {
      this.rowSubs.push(sub);
    }
  }

  private prefillPackagePrice(group: FormGroup): void {
    const articleId = group.get('articleId')?.value;
    const mode = group.get('entryPackagingMode')?.value as EntryPackagingMode;
    const article = this.getArticle(articleId);
    if (!article || mode === 'UNIT') {
      return;
    }
    const packagePrice = mode === 'WHOLESALE'
      ? article.wholesalePurchasePrice
      : article.halfWholesalePurchasePrice;
    if (packagePrice != null && packagePrice > 0) {
      group.patchValue({ packagePrice }, { emitEvent: false });
    }
  }

  hasArticlePackaging(articleId: number | null | undefined): boolean {
    if (articleId == null) {
      return false;
    }
    const article = this.getArticle(articleId);
    const units = article?.unitsPerPackage;
    return !!article && article.packagingType && article.packagingType !== 'NONE'
      && typeof units === 'number' && units >= 2;
  }

  getPackagingLabel(articleId: number): string {
    const article = this.getArticle(articleId);
    if (!article) {
      return 'colis';
    }
    if (article.packagingType === 'SAC') {
      return 'sac';
    }
    if (article.packagingType === 'CARTON') {
      return 'carton';
    }
    return 'colis';
  }

  getComputedQuantity(index: number): number {
    const control = this.articlesArray.at(index);
    const mode = control.get('entryPackagingMode')?.value as EntryPackagingMode;
    if (!mode || mode === 'UNIT') {
      return Number(control.get('quantity')?.value) || 0;
    }
    const article = this.getArticle(control.get('articleId')?.value);
    const packageCount = Number(control.get('packageCount')?.value) || 0;
    const units = article?.unitsPerPackage || 0;
    if (!units || !packageCount) {
      return 0;
    }
    const unitsInMode = mode === 'WHOLESALE' ? units : units / 2;
    return packageCount * unitsInMode;
  }

  getComputedUnitPrice(index: number): number {
    const control = this.articlesArray.at(index);
    const mode = control.get('entryPackagingMode')?.value as EntryPackagingMode;
    if (!mode || mode === 'UNIT') {
      return Number(control.get('unitPrice')?.value) || 0;
    }
    const article = this.getArticle(control.get('articleId')?.value);
    const packagePrice = Number(control.get('packagePrice')?.value) || 0;
    const units = article?.unitsPerPackage || 0;
    if (!units || packagePrice <= 0) {
      return 0;
    }
    const unitsInMode = mode === 'WHOLESALE' ? units : units / 2;
    return Math.round((packagePrice / unitsInMode) * 100) / 100;
  }

  getComputedLineTotal(index: number): number {
    const control = this.articlesArray.at(index);
    const mode = control.get('entryPackagingMode')?.value as EntryPackagingMode;
    if (!mode || mode === 'UNIT') {
      const qty = Number(control.get('quantity')?.value) || 0;
      const pu = Number(control.get('unitPrice')?.value) || 0;
      return qty * pu;
    }
    const packageCount = Number(control.get('packageCount')?.value) || 0;
    const packagePrice = Number(control.get('packagePrice')?.value) || 0;
    return packageCount * packagePrice;
  }

  isPackageMode(index: number): boolean {
    const mode = this.articlesArray.at(index).get('entryPackagingMode')?.value;
    return mode === 'WHOLESALE' || mode === 'HALF_WHOLESALE';
  }

  private applyPackagingModeValidators(group: FormGroup): void {
    const mode = (group.get('entryPackagingMode')?.value as EntryPackagingMode) || 'UNIT';
    const quantityCtrl = group.get('quantity');
    const unitPriceCtrl = group.get('unitPrice');
    const packageCountCtrl = group.get('packageCount');
    const packagePriceCtrl = group.get('packagePrice');

    if (mode === 'UNIT') {
      quantityCtrl?.setValidators([Validators.required, Validators.min(1)]);
      unitPriceCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      packageCountCtrl?.clearValidators();
      packagePriceCtrl?.clearValidators();
      packageCountCtrl?.setValue(null, { emitEvent: false });
      packagePriceCtrl?.setValue(null, { emitEvent: false });
    } else {
      quantityCtrl?.clearValidators();
      unitPriceCtrl?.clearValidators();
      packageCountCtrl?.setValidators([Validators.required, Validators.min(1)]);
      packagePriceCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
    }
    quantityCtrl?.updateValueAndValidity({ emitEvent: false });
    unitPriceCtrl?.updateValueAndValidity({ emitEvent: false });
    packageCountCtrl?.updateValueAndValidity({ emitEvent: false });
    packagePriceCtrl?.updateValueAndValidity({ emitEvent: false });
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
        const data = response.data;
        const newItems = data?.content || [];
        this.indexArticles(newItems);
        const existingIds = new Set(this.articles.map(article => article.id));
        this.articles = [
          ...this.articles,
          ...newItems.filter((article: any) => !existingIds.has(article.id))
        ];
        const totalElements = data?.page?.totalElements ?? data?.totalElements ?? 0;
        this.articlesTotalPages = data?.page?.totalPages
          ?? data?.totalPages
          ?? (totalElements > 0 ? Math.ceil(totalElements / this.pageSize) : 0);
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
      if (this.showPrices || this.capturePurchasePrice) {
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

    this.articlesArray.controls.forEach((control, index) => {
      if (this.capturePurchasePrice) {
        total += this.getComputedLineTotal(index);
        return;
      }
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
    const value = this.articlesArray.controls.map((control, index) => {
      const raw = control.value;
      if (!this.capturePurchasePrice) {
        return raw;
      }
      const mode = (raw.entryPackagingMode || 'UNIT') as EntryPackagingMode;
      if (mode === 'UNIT') {
        return {
          articleId: raw.articleId,
          quantity: raw.quantity,
          unitPrice: raw.unitPrice,
          entryPackagingMode: 'UNIT'
        };
      }
      return {
        articleId: raw.articleId,
        entryPackagingMode: mode,
        packageCount: raw.packageCount,
        packagePrice: raw.packagePrice,
        quantity: this.getComputedQuantity(index),
        unitPrice: this.getComputedUnitPrice(index)
      };
    });
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
    const fields = [item.commercialName, item.name, item.marque, item.model, item.type]
      .filter(Boolean)
      .map((value: string) => String(value).toLowerCase());
    return fields.some(field => field.includes(term));
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
          groupConfig['entryPackagingMode'] = [article.entryPackagingMode || 'UNIT'];
          groupConfig['unitPrice'] = [
            article.unitPrice ?? this.getCatalogPurchasePrice(article.articleId),
            [Validators.required, Validators.min(0.01)]
          ];
          groupConfig['packageCount'] = [article.packageCount ?? null];
          groupConfig['packagePrice'] = [article.packagePrice ?? null];
        }
        const group = this.fb.group(groupConfig);
        if (this.capturePurchasePrice) {
          this.attachPurchasePriceSync(group);
          this.attachPackagingModeSync(group);
          this.applyPackagingModeValidators(group);
        }
        this.articlesArray.push(group);
      });
      this.updateAvailableArticleLists();
      if (this.showPrices || this.capturePurchasePrice) {
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
