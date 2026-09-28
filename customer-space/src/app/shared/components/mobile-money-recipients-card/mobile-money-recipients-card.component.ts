import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { MobileMoneyRecipient } from '../../models/customer.model';

/**
 * Carte des numéros Mobile Money destinataires (Mixx / Moov) avec copie.
 */
@Component({
  selector: 'app-mobile-money-recipients-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './mobile-money-recipients-card.component.html',
  styleUrls: ['./mobile-money-recipients-card.component.scss'],
})
export class MobileMoneyRecipientsCardComponent {
  @Input() recipients: MobileMoneyRecipient | null = null;
  @Input() loading = false;
  @Input() error = '';
  @Input() testIdPrefix = 'e2e-mm-recipients';

  constructor(private toastCtrl: ToastController) {}

  hasRecipientNumbers(): boolean {
    return !!(this.recipients?.mixxNumber || this.recipients?.moovNumber);
  }

  async copyNumber(value: string | undefined, label: string): Promise<void> {
    if (!value) {
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      const toast = await this.toastCtrl.create({
        message: `${label} copié`,
        duration: 1800,
        color: 'dark',
        position: 'bottom',
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Impossible de copier le numéro',
        duration: 2000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
