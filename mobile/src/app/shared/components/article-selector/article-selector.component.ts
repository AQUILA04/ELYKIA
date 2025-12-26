import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { takeUntil, map, distinctUntilChanged } from 'rxjs/operators';
import { Article } from '../../../models/article.model';

export interface ArticleSelectorConfig {
  checkStock: boolean; // Si true, vérifie le stock disponible
  updateStock: boolean; // Si true, met à jour le stock lors de la sélection
  showStockInfo: boolean; // Si true, affiche les informations de stock
  maxQuantityCheck: boolean; // Si true, limite la quantité au stock disponible
}

@Component({
  selector: 'app-article-selector',
  templateUrl: './article-selector.component.html',
  styleUrls: ['./article-selector.component.scss'],
  standalone: false
})
export class ArticleSelectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchTerm$ = new BehaviorSubject<string>('');

  @Input() articles: Article[] = [];
  @Input() articleQuantities: { [key: string]: number } = {};
  @Input() config: ArticleSelectorConfig = {
    checkStock: true,
    updateStock: true,
    showStockInfo: true,
    maxQuantityCheck: true
  };

  @Output() quantityChange = new EventEmitter<{ articleId: string; quantity: number }>();
  @Output() searchChange = new EventEmitter<string>();

  filteredArticles: Article[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.setupFilteredArticles();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilteredArticles() {
    combineLatest([
      this.searchTerm$.pipe(distinctUntilChanged())
    ]).pipe(
      takeUntil(this.destroy$),
      map(([searchTerm]) => {
        const selectedArticleIds = Object.keys(this.articleQuantities).filter(id => this.articleQuantities[id] > 0);
        const selectedArticles = this.articles.filter(article => selectedArticleIds.includes(article.id));

        if (!searchTerm.trim()) {
          // Filtrer selon la configuration
          let availableArticles = this.articles;
          if (this.config.checkStock) {
            availableArticles = availableArticles.filter(article => article.stockQuantity > 0);
          }
          
          const unselectedArticles = availableArticles
            .filter(article => !selectedArticleIds.includes(article.id))
            .slice(0, 10);

          const articlesMap = new Map<string, Article>();
          unselectedArticles.forEach(article => articlesMap.set(article.id, article));
          selectedArticles.forEach(article => articlesMap.set(article.id, article));

          return Array.from(articlesMap.values());
        } else {
          const searchTermLower = searchTerm.toLowerCase();
          let matchingArticles = this.articles.filter(article =>
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
      this.cdr.detectChanges();
    });
  }

  onSearchInput(event: any) {
    const searchTerm = event.target.value || '';
    this.searchTerm$.next(searchTerm);
    this.searchChange.emit(searchTerm);
  }

  getArticleQuantity(articleId: string): number {
    return this.articleQuantities[articleId] || 0;
  }

  getArticleTotal(articleId: string): number {
    const article = this.articles.find(a => a.id === articleId);
    const quantity = this.getArticleQuantity(articleId);
    return article ? article.creditSalePrice * quantity : 0;
  }

  increaseQuantity(article: Article) {
    const currentQuantity = this.getArticleQuantity(article.id);
    const maxQuantity = this.config.maxQuantityCheck ? article.stockQuantity : Number.MAX_SAFE_INTEGER;
    
    if (currentQuantity < maxQuantity) {
      this.quantityChange.emit({
        articleId: article.id,
        quantity: currentQuantity + 1
      });
    }
  }

  decreaseQuantity(article: Article) {
    const currentQuantity = this.getArticleQuantity(article.id);
    if (currentQuantity > 0) {
      this.quantityChange.emit({
        articleId: article.id,
        quantity: currentQuantity - 1
      });
    }
  }

  onQuantityChange(articleId: string, event: any) {
    const quantity = parseInt(event.target.value, 10) || 0;
    const article = this.articles.find(a => a.id === articleId);
    const maxQuantity = this.config.maxQuantityCheck && article ? article.stockQuantity : Number.MAX_SAFE_INTEGER;
    const validQuantity = Math.min(Math.max(0, quantity), maxQuantity);

    this.quantityChange.emit({
      articleId,
      quantity: validQuantity
    });
  }

  canIncreaseQuantity(article: Article): boolean {
    if (!this.config.maxQuantityCheck) return true;
    return this.getArticleQuantity(article.id) < article.stockQuantity;
  }

  shouldShowStockWarning(article: Article): boolean {
    if (!this.config.showStockInfo) return false;
    return article.stockQuantity <= 5; // Seuil d'alerte
  }

  trackByArticleId(index: number, article: Article): string {
    return article.id;
  }
}