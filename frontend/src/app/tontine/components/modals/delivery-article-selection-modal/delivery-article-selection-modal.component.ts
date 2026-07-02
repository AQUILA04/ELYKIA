import { Component, Inject, OnDestroy, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, startWith, takeUntil, finalize } from 'rxjs/operators';
import { of, Subject, Subscription } from 'rxjs';
import { TontineDeliveryService } from '../../../services/tontine-delivery.service';
import { Article as CatalogArticle, ItemService } from 'src/app/article/service/item.service';
import {
  TontineMember,
  DeliveryItemDto,
  CreateDeliveryDto,
  formatCurrency
} from '../../../types/tontine.types';

interface SelectedArticle {
  article: CatalogArticle;
  quantity: number;
  totalPrice: number;
}

@Component({
  selector: 'app-delivery-article-selection-modal',
  templateUrl: './delivery-article-selection-modal.component.html',
  styleUrls: ['./delivery-article-selection-modal.component.scss']
})
export class DeliveryArticleSelectionModalComponent implements OnInit, OnDestroy {
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;

  member: TontineMember;
  searchControl = new FormControl('');
  filteredArticles: CatalogArticle[] = [];
  selectedArticles: SelectedArticle[] = [];
  loading = false;
  error: string | null = null;

  private readonly pageSize = 20;
  private readonly destroy$ = new Subject<void>();
  private articlesPage = 0;
  private articlesTotalPages = 0;
  private articlesSearchTerm = '';
  private loadArticlesSub?: Subscription;
  private autocompletePanel?: HTMLElement;
  private readonly onPanelScroll = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 40) {
      this.loadMoreArticles();
    }
  };

  constructor(
    public dialogRef: MatDialogRef<DeliveryArticleSelectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember },
    private cdr: ChangeDetectorRef,
    private tontineDeliveryService: TontineDeliveryService,
    private itemService: ItemService
  ) {
    this.member = data.member;
  }

  ngOnInit(): void {
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.detachPanelScrollListener();
    this.loadArticlesSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        this.articlesSearchTerm = typeof searchTerm === 'string' ? searchTerm : '';
        this.articlesPage = 0;
        return this.fetchArticlesPage(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe(articles => {
      this.filteredArticles = articles;
      this.cdr.markForCheck();
    });
  }

  private fetchArticlesPage(append: boolean) {
    this.loadArticlesSub?.unsubscribe();
    this.loading = true;

    return this.itemService.getEnabledArticlesPage(
      this.articlesPage,
      this.pageSize,
      'name,asc',
      this.articlesSearchTerm
    ).pipe(
      map(response => {
        const data = response.data;
        const content = data?.content ?? [];
        const totalElements = data?.page?.totalElements ?? data?.totalElements ?? 0;
        this.articlesTotalPages = data?.page?.totalPages
          ?? data?.totalPages
          ?? (totalElements > 0 ? Math.ceil(totalElements / this.pageSize) : 0);
        return append ? [...this.filteredArticles, ...content] : content;
      }),
      finalize(() => {
        this.loading = false;
      }),
      catchError(err => {
        console.error('Error searching articles:', err);
        this.error = 'Erreur lors du chargement des articles';
        return of(append ? this.filteredArticles : []);
      })
    );
  }

  private loadMoreArticles(): void {
    if (this.loading || this.articlesPage >= this.articlesTotalPages - 1) {
      return;
    }

    this.articlesPage++;
    this.loadArticlesSub = this.fetchArticlesPage(true).subscribe(articles => {
      this.filteredArticles = articles;
      this.cdr.markForCheck();
    });
  }

  onAutocompleteOpened(): void {
    setTimeout(() => {
      this.autocompletePanel = this.autocompleteTrigger?.autocomplete?.panel?.nativeElement;
      this.autocompletePanel?.addEventListener('scroll', this.onPanelScroll, { passive: true });
    });
  }

  onAutocompleteClosed(): void {
    this.detachPanelScrollListener();
  }

  private detachPanelScrollListener(): void {
    this.autocompletePanel?.removeEventListener('scroll', this.onPanelScroll);
    this.autocompletePanel = undefined;
  }

  getArticleCode(article: CatalogArticle): string {
    return String(article.id);
  }

  onArticleSelected(article: CatalogArticle): void {
    const existing = this.selectedArticles.find(sa => sa.article.id === article.id);
    if (existing) {
      existing.quantity++;
      existing.totalPrice = existing.article.sellingPrice * existing.quantity;
    } else {
      this.selectedArticles.push({
        article,
        quantity: 1,
        totalPrice: article.sellingPrice
      });
    }
    this.searchControl.setValue('');
  }

  displayArticle(article: CatalogArticle | null): string {
    return article ? '' : '';
  }

  updateQuantity(selectedArticle: SelectedArticle, change: number): void {
    selectedArticle.quantity += change;
    if (selectedArticle.quantity < 1) {
      selectedArticle.quantity = 1;
    }
    selectedArticle.totalPrice = selectedArticle.article.sellingPrice * selectedArticle.quantity;
  }

  removeArticle(selectedArticle: SelectedArticle): void {
    const index = this.selectedArticles.indexOf(selectedArticle);
    if (index > -1) {
      this.selectedArticles.splice(index, 1);
    }
  }

  get totalAmount(): number {
    return this.selectedArticles.reduce((sum, sa) => sum + sa.totalPrice, 0);
  }

  get remainingBalance(): number {
    return this.member.totalContribution - this.totalAmount;
  }

  get isValid(): boolean {
    return this.selectedArticles.length > 0 && this.remainingBalance >= 0;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onValidate(): void {
    if (!this.isValid) return;

    const items: DeliveryItemDto[] = this.selectedArticles.map(sa => ({
      articleId: sa.article.id,
      quantity: sa.quantity,
      unitPrice: sa.article.sellingPrice
    }));

    const createDeliveryDto: CreateDeliveryDto = {
      tontineMemberId: this.member.id,
      items
    };

    this.loading = true;
    this.tontineDeliveryService.createDelivery(createDeliveryDto).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error creating delivery', error);
        this.loading = false;
        this.error = error.message || 'Erreur lors de la création de la livraison.';
      }
    });
  }
}
