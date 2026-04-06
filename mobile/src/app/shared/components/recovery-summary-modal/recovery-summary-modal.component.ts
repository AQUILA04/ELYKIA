import { Component, Input, OnInit } from '@angular/core';
import { LoadingController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { Recovery } from '../../../models/recovery.model';
import { Distribution } from '../../../models/distribution.model';
import { Client } from '../../../models/client.model';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { PdfService } from '../../../core/services/pdf.service';

registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

@Component({
  selector: 'app-recovery-summary-modal',
  templateUrl: './recovery-summary-modal.component.html',
  styleUrls: ['./recovery-summary-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, QRCodeComponent],
})
export class RecoverySummaryModalComponent implements OnInit {

  @Input() recovery!: Recovery;
  @Input() distribution!: Distribution;
  @Input() client!: Client;

  qrCodeData: string = '';

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private pdfService: PdfService
  ) { }

  ngOnInit() {
    const receiptData = {
      type: 'Recouvrement',
      recoveryId: this.recovery.id,
      clientId: this.client.id,
      clientName: this.client.fullName,
      amount: this.recovery.amount,
      date: this.recovery.paymentDate,
      creditRef: this.distribution.reference
    };
    this.qrCodeData = JSON.stringify(receiptData);
  }

  async ionViewDidEnter() {
    setTimeout(async () => {
      const content = document.getElementById('receipt-content');
      if (content) {
        const loading = await this.loadingController.create({
          message: 'Enregistrement des données en cours...',
          backdropDismiss: false
        });
        await loading.present();
        try {
          await this.pdfService.saveReceipt(
            content,
            'recouvrement',
            this.recovery.id
          );
          await loading.dismiss();
        } catch (e) {
          console.error('Failed to auto-save PDF receipt', e);
          await loading.dismiss();
        }
      }
    }, 500);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  print() {
    // TODO: Implement printing logic via NgRx Effect
    console.log('Printing receipt for recovery:', this.recovery.id);
    this.modalController.dismiss({ printed: true });
  }

}
