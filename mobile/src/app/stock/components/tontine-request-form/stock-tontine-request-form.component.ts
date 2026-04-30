import { Component, EventEmitter, Input, Output, Optional, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CreateTontineRequestPayload, TontineRequestItemPayload } from '../../models/stock-tontine-request.model';
import { ArticleService } from '../../../core/services/article.service';
import { Article } from '../../../models/article.model';

@Component({
  selector: 'app-stock-tontine-request-form',
  templateUrl: './stock-tontine-request-form.component.html',
  styleUrls: ['./stock-tontine-request-form.component.scss'],
  standalone: false
})
export class StockTontineRequestFormComponent {
  @Input() isSubmitting = false;
  @Output() formSubmit = new EventEmitter<CreateTontineRequestPayload>();
  @Output() formCancel = new EventEmitter<void>();

  items: TontineRequestItemPayload[] = [];
  availableArticles: Article[] = [];

  // Note: Client and Contract references do not exist on StockTontineRequest entity
  // as per backend code inspection. We are omitting them to ensure alignment with
  // the actual API schema.

  constructor(
    private articleService: ArticleService,
    @Optional() private modalCtrl?: ModalController
  ) {
    this.addItem(); // Start with one empty item
  }

  ngOnInit() {
    this.articleService.getArticles().subscribe({
      next: (articles) => {
        this.availableArticles = articles;
      },
      error: (err) => console.error('Failed to load articles', err)
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

    const payload: CreateTontineRequestPayload = {
      items: this.items
    };

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
