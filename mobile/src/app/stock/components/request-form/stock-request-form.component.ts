import { Component, EventEmitter, Input, Output, OnInit, Optional } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CreateStockRequestPayload, StockRequestItemPayload } from '../../models/stock-request.model';
import { ArticleService } from '../../../core/services/article.service';
import { Article } from '../../../models/article.model';

/**
 * Story 2.2 — StockRequestFormComponent (Presenter)
 * CRITICAL: This is a PRESENTER — it MUST NOT inject StockApiService or HttpClient.
 * It only emits formSubmit/formCancel; the Container (StockDashboardComponent) performs the API call.
 *
 * Architecture: standalone: false — declared in StockModule.
 */
@Component({
  selector: 'app-stock-request-form',
  templateUrl: './stock-request-form.component.html',
  styleUrls: ['./stock-request-form.component.scss'],
  standalone: false
})
export class StockRequestFormComponent implements OnInit {

  /** Controlled by the Container to disable form while the request is in-flight. */
  @Input() isSubmitting = false;

  /** Emitted with the built payload when the user taps Submit. */
  @Output() formSubmit = new EventEmitter<CreateStockRequestPayload>();

  /** Emitted when the user taps Cancel / Close. */
  @Output() formCancel = new EventEmitter<void>();

  /** Dynamic list of items the user is configuring. */
  items: StockRequestItemPayload[] = [];

  /** Articles loaded from the backend, used to populate the article selector. */
  availableArticles: Article[] = [];

  /* Pagination state for the infinite-scroll article loader */
  private currentPage = 0;
  private readonly pageSize = 20;
  hasMoreArticles = true;

  constructor(
    private articleService: ArticleService,
    @Optional() private modalCtrl?: ModalController
  ) {}

  ngOnInit(): void {
    this.addItem(); // Always start with one empty item row
    this.loadArticles();
  }

  /** Loads the next page of articles (supports infinite scroll). */
  loadArticles(event?: any): void {
    if (!this.hasMoreArticles) {
      if (event) event.target.complete();
      return;
    }

    this.articleService.searchArticlesPaginated('', this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.availableArticles = [...this.availableArticles, ...page.content];
        this.hasMoreArticles = page.content.length === this.pageSize;
        this.currentPage++;
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('[StockRequestForm] Failed to load articles:', err);
        if (event) event.target.complete();
      }
    });
  }

  /** Handles the searchbar input to filter articles. Resets pagination. */
  onSearch(event: any): void {
    const query = (event.detail.value as string) || '';
    this.currentPage = 0;
    this.availableArticles = [];
    this.hasMoreArticles = true;

    this.articleService.searchArticlesPaginated(query, 0, this.pageSize).subscribe({
      next: (page) => {
        this.availableArticles = page.content;
        this.hasMoreArticles = page.content.length === this.pageSize;
        this.currentPage = 1;
      },
      error: (err) => console.error('[StockRequestForm] Search failed:', err)
    });
  }

  /** True only when all items have a selected article and quantity > 0. */
  get isValid(): boolean {
    if (this.items.length === 0) return false;
    return this.items.every(item => item.article.id > 0 && item.quantity > 0);
  }

  addItem(): void {
    this.items.push({ article: { id: 0 }, quantity: 0 });
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  onArticleChange(index: number, event: any): void {
    const value = parseInt(event.detail.value, 10);
    this.items[index].article.id = isNaN(value) ? 0 : value;
  }

  /**
   * Submit guard: double-tap prevention (Story 2.4 — AC1).
   * If isSubmitting is already true, the second call is a no-op.
   */
  onSubmit(): void {
    if (!this.isValid || this.isSubmitting) return;

    const payload: CreateStockRequestPayload = {
      items: this.items.map(item => ({ ...item })) // shallow copy to avoid mutation
    };

    this.formSubmit.emit(payload);

    // If used directly as a modal component (without @Output wiring), dismiss with payload
    if (this.modalCtrl) {
      this.modalCtrl.dismiss(payload, 'submit');
    }
  }

  /** Resets the submitting flag — called by Container via template ref on API error (Story 2.4). */
  resetSubmitting(): void {
    this.isSubmitting = false;
  }

  onCancel(): void {
    this.formCancel.emit();
    if (this.modalCtrl) {
      this.modalCtrl.dismiss(null, 'cancel');
    }
  }
}
