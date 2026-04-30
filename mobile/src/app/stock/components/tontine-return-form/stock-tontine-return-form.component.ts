import { Component, EventEmitter, Input, Output, Optional, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CreateTontineReturnPayload, TontineReturnItemPayload } from '../../models/stock-tontine-return.model';
import { ArticleService } from '../../../core/services/article.service';
import { Article } from '../../../models/article.model';

@Component({
  selector: 'app-stock-tontine-return-form',
  templateUrl: './stock-tontine-return-form.component.html',
  styleUrls: ['./stock-tontine-return-form.component.scss'],
  standalone: false
})
export class StockTontineReturnFormComponent {
  @Input() isSubmitting = false;
  @Output() formSubmit = new EventEmitter<CreateTontineReturnPayload>();
  @Output() formCancel = new EventEmitter<void>();

  items: TontineReturnItemPayload[] = [];
  availableArticles: Article[] = [];
  comment: string = '';

  constructor(
    private articleService: ArticleService,
    @Optional() private modalCtrl?: ModalController
  ) {
    this.addItem(); // Start with one empty item
  }

  currentPage = 0;
  pageSize = 20;
  hasMoreArticles = true;

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles(event?: any) {
    if (!this.hasMoreArticles) {
      if (event) event.target.complete();
      return;
    }

    this.articleService.searchArticlesPaginated('', this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.availableArticles = [...this.availableArticles, ...page.content];
        this.hasMoreArticles = page.content.length === this.pageSize;
        this.currentPage++;
        if (event) {
          event.target.complete();
        }
      },
      error: (err) => {
        console.error('Failed to load paginated articles', err);
        if (event) event.target.complete();
      }
    });
  }

  onSearch(event: any) {
    const query = event.detail.value;
    this.currentPage = 0;
    this.availableArticles = [];
    this.hasMoreArticles = true;

    this.articleService.searchArticlesPaginated(query || '', this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.availableArticles = page.content;
        this.hasMoreArticles = page.content.length === this.pageSize;
        this.currentPage++;
      },
      error: (err) => console.error('Failed to search articles', err)
    });
  }

  get isValid(): boolean {
    if (this.items.length === 0) return false;
    return this.items.every(item => item.article.id > 0 && item.quantity > 0);
  }

  addItem(): void {
    this.items.push({ article: { id: 0 }, quantity: 0 });
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
  }

  onArticleChange(index: number, event: any): void {
    const value = parseInt(event.detail.value, 10);
    this.items[index].article.id = isNaN(value) ? 0 : value;
  }

  onSubmit(): void {
    if (!this.isValid || this.isSubmitting) return;

    const payload: CreateTontineReturnPayload = {
      items: this.items
    };

    if (this.comment && this.comment.trim() !== '') {
      payload.comment = this.comment.trim();
    }

    this.formSubmit.emit(payload);

    if (this.modalCtrl) {
      this.modalCtrl.dismiss(payload, 'submit');
    }
  }

  onCancel(): void {
    this.formCancel.emit();
    if (this.modalCtrl) {
      this.modalCtrl.dismiss(null, 'cancel');
    }
  }
}
