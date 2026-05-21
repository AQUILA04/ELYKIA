import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { Article } from '../../../../models/article.model';
import { StockArticlePickerModalComponent } from '../../components/article-picker-modal/stock-article-picker-modal.component';
import { StockRequestItemPayload } from '../../models/stock-request.model';
import { CreateTontineRequestPayload } from '../../models/stock-tontine-request.model';
import { CreateTontineReturnPayload } from '../../models/stock-tontine-return.model';
import { StockApiService } from '../../services/stock-api.service';

export type StockOperationKind = 'request' | 'return';
export type StockOperationContext = 'STANDARD' | 'TONTINE';

export interface StockCreateLineItem {
  article: Article;
  quantity: number;
}

@Component({
  selector: 'app-stock-operation-create',
  templateUrl: './stock-operation-create.page.html',
  styleUrls: ['./stock-operation-create.page.scss'],
  standalone: false
})
export class StockOperationCreatePage implements OnInit {
  kind: StockOperationKind = 'request';
  context: StockOperationContext = 'STANDARD';
  pageTitle = 'Nouvelle Sortie';
  submitLabel = 'Soumettre la demande';
  showRequestDate = false;
  showComment = false;

  isSubmitting = false;
  requestDate = '';
  demandeur = '';
  comment = '';
  lineItems: StockCreateLineItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockApiService: StockApiService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.kind = data['kind'] ?? 'request';
    this.context = data['context'] ?? 'STANDARD';
    this.pageTitle = data['pageTitle'] ?? 'Nouvelle Sortie';
    this.submitLabel = data['submitLabel'] ?? 'Soumettre la demande';
    this.showRequestDate = !!data['showRequestDate'];
    this.showComment = !!data['showComment'];

    const user = this.authService.currentUser;
    this.demandeur = user?.username ?? '';

    const today = new Date();
    this.requestDate = today.toISOString().split('T')[0];
  }

  get isValid(): boolean {
    return this.lineItems.length > 0 && this.lineItems.every(item => item.quantity > 0);
  }

  get formattedRequestDate(): string {
    if (!this.requestDate) {
      return '';
    }
    const [year, month, day] = this.requestDate.split('-');
    return `${day}/${month}/${year}`;
  }

  get listBackUrl(): string {
    return '/tabs/stock';
  }

  goBack(): void {
    this.router.navigate([this.listBackUrl]);
  }

  async openArticlePicker(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StockArticlePickerModalComponent,
      cssClass: 'stock-article-picker-modal'
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<Article>();
    if (role !== 'selected' || !data) {
      return;
    }

    const existing = this.lineItems.find(item => item.article.id === data.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }

    this.lineItems.push({ article: data, quantity: 1 });
  }

  incrementQty(index: number): void {
    this.lineItems[index].quantity += 1;
  }

  decrementQty(index: number): void {
    if (this.lineItems[index].quantity > 1) {
      this.lineItems[index].quantity -= 1;
    }
  }

  removeLine(index: number): void {
    this.lineItems.splice(index, 1);
  }

  displayName(article: Article): string {
    return article.commercialName || article.name;
  }

  getInitials(name: string): string {
    const clean = (name || '').trim();
    if (!clean) return '??';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#EF4444', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  }

  onSubmit(): void {
    if (!this.isValid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const items = this.lineItems.map(line => ({
      article: { id: parseInt(line.article.id, 10) },
      quantity: line.quantity
    }));

    const onSuccess = async () => {
      await this.showToast('Opération créée avec succès.', 'success');
      this.router.navigate([this.listBackUrl]);
    };

    const onError = async () => {
      this.isSubmitting = false;
      await this.showToast('Erreur réseau. Veuillez réessayer.', 'danger');
    };

    if (this.kind === 'request' && this.context === 'STANDARD') {
      this.stockApiService.createStandardRequest(items).subscribe({ next: onSuccess, error: onError });
      return;
    }

    if (this.kind === 'return' && this.context === 'STANDARD') {
      this.stockApiService.createStandardReturn(items, this.comment).subscribe({ next: onSuccess, error: onError });
      return;
    }

    if (this.kind === 'request' && this.context === 'TONTINE') {
      const payload: CreateTontineRequestPayload = {
        items,
        requestDate: this.showRequestDate ? this.requestDate : undefined
      };
      this.stockApiService.createTontineRequest(payload).subscribe({ next: onSuccess, error: onError });
      return;
    }

    const payload: CreateTontineReturnPayload = {
      items,
      comment: this.comment.trim() || undefined
    };
    this.stockApiService.createTontineReturn(payload).subscribe({ next: onSuccess, error: onError });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 4000, position: 'bottom', color });
    await toast.present();
  }
}
