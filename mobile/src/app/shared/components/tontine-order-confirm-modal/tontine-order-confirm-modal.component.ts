import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { PlannedDateFieldComponent } from '../planned-date-field/planned-date-field.component';

export interface TontineOrderConfirmResult {
  plannedDeliveryDate: string | null;
}

/** Confirmation d'une commande tontine : total, date de livraison prévue (facultative), validation. */
@Component({
  selector: 'app-tontine-order-confirm-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, PlannedDateFieldComponent],
  templateUrl: './tontine-order-confirm-modal.component.html',
  styleUrls: ['./tontine-order-confirm-modal.component.scss']
})
export class TontineOrderConfirmModalComponent {
  @Input() total = 0;
  @Input() plannedDeliveryDate: string | null = null;

  constructor(private readonly modalCtrl: ModalController) {}

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    const result: TontineOrderConfirmResult = { plannedDeliveryDate: this.plannedDeliveryDate };
    void this.modalCtrl.dismiss(result, 'confirm');
  }
}
