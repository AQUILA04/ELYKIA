import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-amount-confirmation-modal',
  templateUrl: './amount-confirmation-modal.component.html',
  styleUrls: ['./amount-confirmation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class AmountConfirmationModalComponent {
  @Input() calculatedAmount!: number;

  /** Ionic peut lier un nombre si type="number". */
  amountInput: string | number = '';
  isSubmitting = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly toastController: ToastController
  ) {}

  async cancel(): Promise<void> {
    await this.modalController.dismiss({ confirmed: false });
  }

  async confirm(): Promise<void> {
    const entered = this.parseEnteredAmount(this.amountInput);

    if (isNaN(entered)) {
      await this.showToast('Saisissez un montant valide.', 'warning');
      return;
    }

    if (entered !== this.calculatedAmount) {
      await this.showToast(
        `Le montant saisi (${this.formatAmount(entered)} FCFA) ne correspond pas au montant calculé (${this.formatAmount(this.calculatedAmount)} FCFA).`,
        'danger'
      );
      return;
    }

    await this.modalController.dismiss({ confirmed: true, confirmedAmount: entered });
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR');
  }

  private parseEnteredAmount(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return NaN;
    }
    if (typeof value === 'number') {
      return value;
    }
    const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
    return parseFloat(normalized);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
