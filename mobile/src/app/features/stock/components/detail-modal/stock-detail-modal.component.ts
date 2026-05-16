import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { StockRequest, StockOperationLineItem } from '../../models/stock-request.model';
import { StockReturn } from '../../models/stock-return.model';

@Component({
  selector: 'app-stock-detail-modal',
  templateUrl: './stock-detail-modal.component.html',
  styleUrls: ['./stock-detail-modal.component.scss'],
  standalone: false
})
export class StockDetailModalComponent implements OnInit {
  @Input() operation!: StockRequest | StockReturn;
  @Input() type!: 'request' | 'return';

  items: StockOperationLineItem[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    const raw = this.operation?.items;
    this.items = Array.isArray(raw) ? raw : [];
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  cancelRequest(): void {
    // Dismiss the modal and trigger cancellation in the dashboard
    this.modalCtrl.dismiss(this.operation, 'cancel');
  }

  get isRequest(): boolean {
    return this.type === 'request';
  }

  get isCancellable(): boolean {
    return this.isRequest && (this.operation?.status === 'CREATED' || this.operation?.status === 'PENDING');
  }

  /** Total opération tel que renvoyé par l'API (pas de recalcul depuis les lignes). */
  get operationTotal(): number | null {
    if (!this.operation) {
      return null;
    }
    const op = this.operation;
    if (this.isRequest) {
      const total = op.totalCreditSalePrice ?? op.totalSalePrice;
      return total != null ? total : null;
    }
    const total = op.totalSalePrice ?? op.totalAmount ?? op.totalCreditSalePrice;
    return total != null ? total : null;
  }

  itemDisplayName(item: StockOperationLineItem): string {
    return item.itemName || item.article?.name || '';
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
    // Generate a pseudorandom color based on the string
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#10B981', 
      '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
