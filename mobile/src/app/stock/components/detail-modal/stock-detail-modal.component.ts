import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { StockRequest } from '../../models/stock-request.model';
import { StockReturn } from '../../models/stock-return.model';

@Component({
  selector: 'app-stock-detail-modal',
  templateUrl: './stock-detail-modal.component.html',
  styleUrls: ['./stock-detail-modal.component.scss'],
  standalone: false
})
export class StockDetailModalComponent {
  @Input() operation!: StockRequest | StockReturn;
  @Input() type!: 'request' | 'return';

  constructor(private modalCtrl: ModalController) {}

  close(): void {
    console.log('[StockDetailModal] Close arrow clicked');
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

  private readonly emptyItems = [];

  get items(): any[] {
    if (Array.isArray(this.operation?.items)) {
      return this.operation.items;
    }
    return this.emptyItems;
  }

  get totalSum(): number {
    return this.items.reduce((sum, item) => {
      const price = item.unitPrice || 0;
      const qty = item.quantity || 0;
      return sum + (price * qty);
    }, 0);
  }

  getInitials(name: string): string {
    if (!name || typeof name !== 'string') return '??';
    const cleanName = name.trim();
    if (!cleanName) return '??';
    
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
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
