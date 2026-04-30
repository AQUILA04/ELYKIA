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
