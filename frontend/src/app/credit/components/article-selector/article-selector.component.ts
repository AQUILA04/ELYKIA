import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface ArticleSelection {
  articleId: number;
  quantity: number;
}

export type PriceType = 'credit' | 'tontine' | 'inventory';

@Component({
  selector: 'app-article-selector',
  templateUrl: './article-selector.component.html',
  styleUrls: ['./article-selector.component.scss'],
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
export class ArticleSelectorComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  @Input() articles: any[] = [];
  @Input() readonly: boolean = false;
  @Input() priceType: PriceType = 'credit'; // 'credit', 'tontine' ou 'inventory'
  @Input() showPrices: boolean = true; // Nouvelle option pour afficher/masquer les prix
  @Input() showStock: boolean = true;
  // ✅ Propriété de validation
  @Input() validateStock: boolean = false;
  @Output() articlesChange = new EventEmitter<ArticleSelection[]>();
  @Output() totalAmountChange = new EventEmitter<number>();

  articleForm!: FormGroup;
  availableArticlesPerRow: any[][] = [];
  totalAmount: number = 0;
  private articlesSub?: Subscription;

  // ControlValueAccessor
  private onChange: (value: ArticleSelection[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor(private fb: FormBuilder) {
    this.articleForm = this.fb.group({
      articles: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Déterminer si on doit afficher les prix selon le type
    if (this.priceType === 'inventory') {
      this.showPrices = false;
    }

    if (this.articlesArray.length === 0) {
      this.addArticle();
    }
    this.listenForArticleChanges();
  }

  ngOnDestroy(): void {
    if (this.articlesSub) {
      this.articlesSub.unsubscribe();
    }
  }

  get articlesArray(): FormArray {
    return this.articleForm.get('articles') as FormArray;
  }

  createArticle(): FormGroup {
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

    this.articlesArray.removeAt(index);
    this.updateAvailableArticleLists();
    this.listenForArticleChanges();
    this.emitChanges();
  }

  private listenForArticleChanges(): void {
    if (this.articlesSub) {
      this.articlesSub.unsubscribe();
    }

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
      const selectedIdsInOtherRows = allControls
        .filter((__, index) => index !== currentIndex)
        .map(control => control.get('articleId')?.value)
        .filter(id => id != null);

      return this.articles.filter(
        article => !selectedIdsInOtherRows.includes(article.id)
      );
    });
  }

  private calculateTotalAmount(): void {
    let total = 0;

    this.articlesArray.controls.forEach(control => {
      const articleId = control.get('articleId')?.value;
      const quantity = control.get('quantity')?.value;

      if (articleId && quantity > 0) {
        const article = this.articles.find(a => a.id === articleId);
        if (article) {
          // Utiliser le bon prix selon le type
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
    term = term.toLowerCase();
    return item.commercialName && item.commercialName.toLowerCase().includes(term);
  }

  // Méthode pour obtenir le prix d'un article selon le type
  getArticlePrice(articleId: number): number {
    const article = this.articles.find(a => a.id === articleId);
    if (!article) return 0;

    switch (this.priceType) {
      case 'tontine':
        return article.sellingPrice || 0;
      case 'credit':
        return article.creditSalePrice || 0;
      case 'inventory':
        return article.sellingPrice || 0; // Prix par défaut pour inventory
      default:
        return article.sellingPrice || 0;
    }
  }

  // Méthode pour calculer le sous-total d'une ligne
  getLineTotal(index: number): number {
    const control = this.articlesArray.at(index);
    const articleId = control.get('articleId')?.value;
    const quantity = control.get('quantity')?.value || 0;

    if (!articleId || quantity <= 0) return 0;

    return this.getArticlePrice(articleId) * quantity;
  }

  // Vérifier si on doit afficher les colonnes de prix
  shouldShowPriceColumns(): boolean {
    return this.showPrices && this.priceType !== 'inventory';
  }

  // ControlValueAccessor implementation
  writeValue(value: ArticleSelection[]): void {
    if (value && Array.isArray(value)) {
      this.articlesArray.clear();
      value.forEach(article => {
        this.articlesArray.push(this.fb.group({
          articleId: [article.articleId, Validators.required],
          quantity: [article.quantity, [Validators.required, Validators.min(1)]]
        }));
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

  // Validator implementation
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
  private stockValidator(control: AbstractControl): ValidationErrors | null {
    const quantity = control.value;
    const articleId = control.parent?.get('articleId')?.value;

    if (!articleId || !quantity) return null;

    const article = this.articles.find(a => a.id === articleId);
    if (!article) return null;

    const stock = article.stockQuantity || 0;

    if (quantity > stock) {
      return {
        stockExceeded: {
          available: stock,
          requested: quantity
        }
      };
    }

    return null;
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
    const article = this.articles.find(a => a.id === articleId);
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
