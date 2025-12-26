import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface DistributionConfirmationData {
  clientName: string;
  articlesCount: number;
  totalAmount: number;
  dailyPayment: number;
  advance: number;
}

@Component({
  selector: 'app-distribution-confirmation-modal',
  templateUrl: './distribution-confirmation-modal.component.html',
  styleUrls: ['./distribution-confirmation-modal.component.scss'],
  standalone: false,
})
export class DistributionConfirmationModalComponent {
  @Input() distributionData: DistributionConfirmationData = {
    clientName: '',
    articlesCount: 0,
    totalAmount: 0,
    dailyPayment: 0,
    advance: 0
  };

  @Output() confirmed = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  constructor(private modalController: ModalController) {}

  confirm() {
    this.modalController.dismiss(null, 'confirmed');
  }

  dismiss() {
    this.modalController.dismiss(null, 'canceled');
  }
}

