import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, tap, startWith } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { TontineDeliveryService } from '../../../services/tontine-delivery.service'; // Added
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // Keep for article loading
import { TokenStorageService } from 'src/app/shared/service/token-storage.service'; // Keep for article loading
import { environment } from 'src/environments/environment';
import {
  TontineMember,
  Article,
  DeliveryItemDto,
  CreateDeliveryDto, // Added
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
  articles: Article[] = [];
  filteredArticles$: Observable<Article[]> = of([]);
  selectedArticles: SelectedArticle[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<DeliveryArticleSelectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember },
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private cdr: ChangeDetectorRef,
    private tontineDeliveryService: TontineDeliveryService // Injected TontineDeliveryService
  ) {
    this.member = data.member;
  }

  ngOnInit(): void {
    this.loadArticles();
    this.setupSearch();
  }

  private loadArticles(): void {
    this.loading = true;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.tokenStorage.getToken()}`,
      'Content-Type': 'application/json'
    });

    const params = new HttpParams().set('size', '10000');

    this.http.get<any>(`${environment.apiUrl}/api/v1/articles`, { headers, params })
      .pipe(
        catchError(err => {
          console.error('Error loading articles:', err);
          this.error = 'Erreur lors du chargement des articles';
          return of({ data: { content: [] } });
        })
      )
      .subscribe(response => {
        this.articles = response.data?.content || [];
        console.log('Articles loaded:', this.articles.length);
        this.loading = false;
      });
  }

  private setupSearch(): void {
    this.filteredArticles$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      tap(searchTerm => console.log('Search term:', searchTerm)),
      switchMap(searchTerm => {
        if (typeof searchTerm === 'string') {
          return this.searchArticles(searchTerm);
        }
        return of([]);
      }),
      tap(articles => console.log('Articles to display:', articles))
    );
  }

  private searchArticles(searchTerm: string): Observable<Article[]> {
    console.log('searchArticles called with:', searchTerm);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      console.log('Search term too short, returning first 50 articles');
      const result = this.articles.filter(a => a.active !== false).slice(0, 50);
      console.log('Returning articles:', result.length);
      return of(result);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.tokenStorage.getToken()}`,
      'Content-Type': 'application/json'
    });

    const searchUrl = `${environment.apiUrl}/api/v1/articles/elasticsearch`;
    const body = { keyword: searchTerm.trim() };
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '100')
      .set('sort', 'id,desc');

    console.log('Calling Elasticsearch API with:', body);

    return this.http.post<any>(searchUrl, body, { headers, params })
      .pipe(
        tap(response => console.log('Elasticsearch response:', response)),
        map(response => {
          const articles = response.data?.content || [];
          console.log('Articles before filter:', articles);
          // Ne pas filtrer par active ici, retourner tous les articles
          const filtered = articles.filter((a: Article) => a.active !== false);
          console.log('Filtered articles:', filtered.length, filtered);
          return filtered;
        }),
        catchError(err => {
          console.error('Error searching articles:', err);
          return of(this.articles.filter(a => a.active !== false).slice(0, 50));
        })
      );
  }

  onArticleSelected(article: Article): void {
    console.log('Article selected:', article);
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
      unitPrice: sa.article.sellingPrice // Add unitPrice here as per new DTO
    }));

    const createDeliveryDto: CreateDeliveryDto = {
      tontineMemberId: this.member.id, // Use tontineMemberId as per new DTO
      items: items
    };

    this.loading = true; // Show loading indicator
    this.tontineDeliveryService.createDelivery(createDeliveryDto).subscribe({
      next: (response) => {
        console.log('Delivery created successfully', response);
        this.loading = false;
        this.dialogRef.close(true); // Close with 'true' to indicate success
      },
      error: (error) => {
        console.error('Error creating delivery', error);
        this.loading = false;
        this.error = error.message || 'Erreur lors de la création de la livraison.';
        // Optionally, show a more user-friendly error message or keep the dialog open
      }
    });
  }
}
