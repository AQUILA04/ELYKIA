import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Distribution } from '../../../models/distribution.model';
import { Client } from '../../../models/client.model';
import { Article } from '../../../models/article.model';
import { User } from '../../../models/auth.model';
import { PrintableDistribution, PrintingService } from '../../../core/services/printing.service';
import * as DistributionActions from '../../../store/distribution/distribution.actions';
import { PdfService } from '../../../core/services/pdf.service';

@Component({
  selector: 'app-print-receipt-modal',
  templateUrl: './print-receipt-modal.component.html',
  styleUrls: ['./print-receipt-modal.component.scss'],
  standalone: false,
})
export class PrintReceiptModalComponent implements OnInit {
  @Input() distribution!: Distribution;
  @Input() client!: Client;
  @Input() articles!: any[];
  @Input() commercial!: User;

  printableDistribution!: PrintableDistribution;
  qrCodeData: string = '';

  constructor(
    private modalController: ModalController,
    private store: Store,
    private pdfService: PdfService
  ) { }

  ngOnInit() {
    this.printableDistribution = {
      distribution: this.distribution,
      client: this.client,
      articles: this.articles,
      commercial: {
        name: this.commercial ? `${this.commercial.username}` : 'N/A',
        phone: '' // Phone not available in user model
      }
    };

    const receiptData = {
      type: 'Distribution',
      distributionId: this.distribution.id,
      reference: this.distribution.reference,
      clientId: this.client.id,
      clientName: this.client.fullName,
      totalAmount: this.distribution.totalAmount,
      advance: this.distribution.advance,
      remainingAmount: this.distribution.remainingAmount,
      dailyPayment: this.distribution.dailyPayment,
      date: this.distribution.createdAt
    };
    this.qrCodeData = JSON.stringify(receiptData);
  }

  async ionViewDidEnter() {
    setTimeout(async () => {
      const content = document.getElementById('receipt-content');
      if (content) {
        try {
          await this.pdfService.saveReceipt(
            content,
            'distribution',
            this.distribution.reference || `DIST-${this.distribution.id}`
          );
        } catch (e) {
          console.error('Failed to auto-save PDF receipt', e);
        }
      }
    }, 500);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  print() {
    this.store.dispatch(DistributionActions.printReceipt({ printableDistribution: this.printableDistribution }));
    this.dismiss();
  }
}
