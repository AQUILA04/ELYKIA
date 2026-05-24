import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { StockOperationLineItem } from '../../models/stock-request.model';
import { StockRequest } from '../../models/stock-request.model';
import { StockReturn } from '../../models/stock-return.model';
import { StockApiService } from '../../services/stock-api.service';
import { StockOperationContext, StockOperationKind } from '../stock-operation-create/stock-operation-create.page';

type StockOperation = StockRequest | StockReturn;

@Component({
  selector: 'app-stock-operation-detail',
  templateUrl: './stock-operation-detail.page.html',
  styleUrls: [
    './stock-operation-detail.page.scss',
    '../../components/detail-modal/stock-detail-modal.component.scss'
  ],
  standalone: false
})
export class StockOperationDetailPage implements OnInit {
  kind: StockOperationKind = 'request';
  context: StockOperationContext = 'STANDARD';
  pageTitle = 'Détail de la demande';
  cancelLabel = 'Annuler la demande';

  operation!: StockOperation;
  items: StockOperationLineItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockApiService: StockApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.kind = data['kind'] ?? 'request';
    this.context = data['context'] ?? 'STANDARD';
    this.pageTitle = data['pageTitle'] ?? 'Détail de la demande';
    this.cancelLabel = data['cancelLabel'] ?? 'Annuler la demande';

    const state = this.router.getCurrentNavigation()?.extras?.state as { operation?: StockOperation } | undefined;
    const operation = state?.operation;

    if (!operation) {
      this.router.navigate(['/tabs/stock']);
      return;
    }

    this.operation = operation;
    const raw = operation.items;
    this.items = Array.isArray(raw) ? raw : [];
  }

  goBack(): void {
    this.router.navigate(['/tabs/stock']);
  }

  get isRequest(): boolean {
    return this.kind === 'request';
  }

  get isCancellable(): boolean {
    return this.operation?.status === 'CREATED' || this.operation?.status === 'PENDING';
  }

  get operationTotal(): number | null {
    const op = this.operation;
    if (!op) {
      return null;
    }
    if (this.isRequest) {
      const req = op as StockRequest;
      return this.asNumber(req.totalCreditSalePrice ?? req.totalSalePrice ?? req.totalPurchasePrice);
    }
    const ret = op as StockReturn;
    return this.asNumber(ret.totalSalePrice ?? ret.totalAmount ?? ret.totalCreditSalePrice);
  }

  get primaryDate(): string | null {
    if (!this.operation) return null;
    if (this.isRequest) {
      return (this.operation as StockRequest).requestDate ?? null;
    }
    return (this.operation as StockReturn).returnDate ?? null;
  }

  get validationDate(): string | null {
    if (!this.operation) return null;
    return 'validationDate' in this.operation ? (this.operation.validationDate ?? null) : null;
  }

  get deliveryDate(): string | null {
    if (!this.operation || !this.isRequest) return null;
    const req = this.operation as StockRequest;
    return req.deliveryDate ?? req.updatedAt ?? null;
  }

  private asNumber(value: unknown): number | null {
    return typeof value === 'number' && !Number.isNaN(value) ? value : null;
  }

  getInitials(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') return '??';
    const cleanName = name.trim();
    if (!cleanName) return '??';
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') return '#94A3B8';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#10B981',
      '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  async cancelOperation(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirmer l\'annulation',
      message: 'Êtes-vous sûr de vouloir annuler cette opération ?',
      buttons: [
        { text: 'Garder', role: 'cancel' },
        {
          text: this.cancelLabel,
          role: 'destructive',
          handler: () => { this.executeCancel(); }
        }
      ]
    });
    await alert.present();
  }

  private executeCancel(): void {
    const id = this.operation.id;
    let cancel$;

    if (this.isRequest && this.context === 'STANDARD') {
      cancel$ = this.stockApiService.cancelStandardRequest(id);
    } else if (this.isRequest && this.context === 'TONTINE') {
      cancel$ = this.stockApiService.cancelTontineRequest(id);
    } else if (!this.isRequest && this.context === 'STANDARD') {
      cancel$ = this.stockApiService.cancelStandardReturn(id);
    } else {
      cancel$ = this.stockApiService.cancelTontineReturn(id);
    }

    cancel$.subscribe({
      next: async () => {
        await this.showToast('Opération annulée.', 'success');
        this.router.navigate(['/tabs/stock']);
      },
      error: async () => {
        await this.showToast('Erreur lors de l\'annulation.', 'danger');
      }
    });
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
