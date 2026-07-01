import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, tap, startWith } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { TontineDeliveryService } from '../../../services/tontine-delivery.service';
import { ItemService } from 'src/app/article/service/item.service';
import {
  TontineMember,
  Article,
  DeliveryItemDto,
  CreateDeliveryDto,
  formatCurrency
} from '../../../types/tontine.types';

interface SelectedArticle {
  article: Article;
  quantity: number;
  totalPrice: number;
}

@Component({
  selector: 'app-delivery-article-selection-modal',
  templateUrl: './delivery-article-selection-modal.component.html',
  styleUrls: ['./delivery-article-selection-modal.component.scss']
})
export class DeliveryArticleSelectionModalComponent implements OnInit {
  member: TontineMember;
  searchControl = new FormControl('');
  filteredArticles$: Observable<Article[]> = of([]);
  selectedArticles: SelectedArticle[] = [];
  loading = false;
  error: string | null = null;

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

  private setupSearch(): void {
    this.filteredArticles$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => this.searchArticles(typeof searchTerm === 'string' ? searchTerm : '')),
      tap(() => this.cdr.markForCheck())
    );
  }

  private searchArticles(searchTerm: string): Observable<Article[]> {
    this.loading = true;
    return this.itemService.getEnabledArticlesPage(0, 20, 'name,asc', searchTerm).pipe(
      map(response => (response.data?.content || []) as Article[]),
      tap(() => {
        this.loading = false;
      }),
      catchError(err => {
        console.error('Error searching articles:', err);
        this.loading = false;
        this.error = 'Erreur lors du chargement des articles';
        return of([]);
      })
    );
  }

  onArticleSelected(article: Article): void {
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

  displayArticle(article: Article | null): string {
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
