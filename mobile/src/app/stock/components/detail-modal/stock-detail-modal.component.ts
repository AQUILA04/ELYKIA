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
    this.modalCtrl.dismiss();
  }

  get isRequest(): boolean {
    return this.type === 'request';
  }

  get items(): any[] {
    return this.operation?.items || [];
  }
}
