import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Distribution } from '../../models/distribution.model';
import { Client } from '../../models/client.model';
import { Article } from '../../models/article.model';
import { Recovery } from '../../models/recovery.model';

export interface PrintableDistribution {
  distribution: Distribution;
  client: Client;
  articles: Array<{
    article: Article;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  commercial: {
    name: string;
    phone?: string;
  };
}

export interface PrintResult {
  success: boolean;
  message: string;
  pdfPath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private isBluetoothAvailable = false;
  private connectedPrinter: any = null;

  constructor(private platform: Platform) {
    this.checkBluetoothAvailability();
  }

  private async checkBluetoothAvailability(): Promise<void> {
    if (this.platform.is('cordova')) {
      // Check if Bluetooth printer plugin is available
      // This would require cordova-plugin-bluetooth-printer
      try {
        // @ts-ignore
        if (window.BluetoothPrinter) {
          this.isBluetoothAvailable = true;
        }
      } catch (error) {
        console.log('Bluetooth printer plugin not available');
        this.isBluetoothAvailable = false;
      }
    }
  }

  printDistributionReceipt(printableDistribution: PrintableDistribution): Observable<PrintResult> {
    return from(this.printDistributionReceiptAsync(printableDistribution));
  }

  private async printDistributionReceiptAsync(printableDistribution: PrintableDistribution): Promise<PrintResult> {
    try {
      // Try Bluetooth printing first
      if (this.isBluetoothAvailable) {
        const bluetoothResult = await this.printViaBluetooth(printableDistribution);
        if (bluetoothResult.success) {
          return bluetoothResult;
        }
      }

      // Fallback to PDF generation
      return await this.generatePDF(printableDistribution);

    } catch (error) {
      console.error('Print error:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'impression: ' + (error as Error).message
      };
    }
  }

  private async printViaBluetooth(printableDistribution: PrintableDistribution): Promise<PrintResult> {
    try {
      // Check if printer is connected
      if (!this.connectedPrinter) {
        const printers = await this.discoverBluetoothPrinters();
        if (printers.length === 0) {
          throw new Error('Aucune imprimante Bluetooth trouvée');
        }

        // Auto-connect to first available printer
        this.connectedPrinter = printers[0];
        await this.connectToPrinter(this.connectedPrinter);
      }

      // Generate ESC/POS commands for thermal printer (58mm)
      const escPosCommands = this.generateESCPOSCommands(printableDistribution);

      // Send to printer
      // @ts-ignore
      await window.BluetoothPrinter.print(escPosCommands);

      return {
        success: true,
        message: 'Reçu imprimé avec succès'
      };

    } catch (error) {
      console.error('Bluetooth printing error:', error);
      throw error;
    }
  }

  private async discoverBluetoothPrinters(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      window.BluetoothPrinter.list(
        (devices: any[]) => resolve(devices),
        (error: any) => reject(error)
      );
    });
  }

  private async connectToPrinter(printer: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      window.BluetoothPrinter.connect(
        printer.address,
        () => resolve(),
        (error: any) => reject(error)
      );
    });
  }

  private generateESCPOSCommands(printableDistribution: PrintableDistribution): string {
    const { distribution, client, articles, commercial } = printableDistribution;

    let commands = '';

    // Initialize printer
    commands += '\x1B\x40'; // ESC @ - Initialize
    commands += '\x1B\x61\x01'; // ESC a 1 - Center alignment

    // Header
    commands += '\x1B\x21\x30'; // ESC ! 48 - Double height and width
    commands += 'ELYKIA COMMERCIAL\n';
    commands += '\x1B\x21\x00'; // ESC ! 0 - Normal size
    commands += '================================\n';
    commands += 'RECU DE DISTRIBUTION\n';
    commands += '================================\n\n';

    // Left alignment for details
    commands += '\x1B\x61\x00'; // ESC a 0 - Left alignment

    // Distribution info
    commands += `Ref: ${distribution.reference || 'N/A'}\n`;
    commands += `Date: ${new Date(distribution.createdAt).toLocaleDateString('fr-FR')}\n`;
    commands += `Heure: ${new Date(distribution.createdAt).toLocaleTimeString('fr-FR')}\n\n`;

    // Client info
    commands += 'CLIENT:\n';
    commands += `${client.firstname} ${client.lastname}\n`;
    if (client.address) commands += `${client.address}\n`;
    if (client.phone) commands += `Tel: ${client.phone}\n`;
    commands += '\n';

    // Commercial info
    commands += 'COMMERCIAL:\n';
    commands += `${commercial.name}\n`;
    if (commercial.phone) commands += `Tel: ${commercial.phone}\n`;
    commands += '\n';

    // Articles
    commands += 'ARTICLES:\n';
    commands += '--------------------------------\n';

    articles.forEach(item => {
      const articleName = item.article.commercialName || item.article.name;
      const truncatedName = articleName.length > 20 ?
        articleName.substring(0, 17) + '...' : articleName;

      commands += `${truncatedName}\n`;
      commands += `  ${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')} = ${item.totalPrice.toLocaleString('fr-FR')} FCFA\n`;
    });

    commands += '--------------------------------\n';

    // Totals
    commands += '\x1B\x21\x08'; // ESC ! 8 - Emphasized
    commands += `TOTAL: ${distribution.totalAmount.toLocaleString('fr-FR')} FCFA\n`;
    commands += `MISE/JOUR: ${distribution.dailyPayment.toLocaleString('fr-FR')} FCFA\n`;
    commands += '\x1B\x21\x00'; // ESC ! 0 - Normal

    commands += '\n';
    commands += '================================\n';
    commands += '\x1B\x61\x01'; // Center alignment
    commands += 'Merci pour votre confiance!\n';
    commands += 'Payez regulierement vos mises\n';
    commands += '================================\n\n\n';

    // Cut paper
    commands += '\x1D\x56\x00'; // GS V 0 - Full cut

    return commands;
  }

  private async generatePDF(printableDistribution: PrintableDistribution): Promise<PrintResult> {
    try {
      const htmlContent = this.generateReceiptHTML(printableDistribution);

      if (this.platform.is('cordova')) {
        // Use cordova-plugin-file to save PDF
        const pdfPath = await this.savePDFToDevice(htmlContent, printableDistribution.distribution.reference || 'distribution');
        return {
          success: true,
          message: 'Reçu sauvegardé en PDF',
          pdfPath
        };
      } else {
        // Web fallback - open print dialog
        this.openPrintDialog(htmlContent);
        return {
          success: true,
          message: 'Fenêtre d\'impression ouverte'
        };
      }

    } catch (error) {
      throw new Error('Erreur lors de la génération du PDF: ' + (error as Error).message);
    }
  }

  private generateReceiptHTML(printableDistribution: PrintableDistribution): string {
    const { distribution, client, articles, commercial } = printableDistribution;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Distribution</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: 300px;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-row {
            font-weight: bold;
            font-size: 13px;
          }
          .article-item {
            margin-bottom: 10px;
          }
          .article-name {
            font-weight: bold;
          }
          .article-details {
            margin-left: 10px;
            color: #666;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ELYKIA COMMERCIAL<br>
          REÇU DE DISTRIBUTION
        </div>

        <div class="separator"></div>

        <div class="row">
          <span>Référence:</span>
          <span>${distribution.reference || 'N/A'}</span>
        </div>
        <div class="row">
          <span>Date:</span>
          <span>${new Date(distribution.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="row">
          <span>Heure:</span>
          <span>${new Date(distribution.createdAt).toLocaleTimeString('fr-FR')}</span>
        </div>

        <div class="separator"></div>

        <div style="margin-bottom: 10px;">
          <strong>CLIENT:</strong><br>
          ${client.firstname} ${client.lastname}<br>
          ${client.address || ''}<br>
          ${client.phone || ''}
        </div>

        <div style="margin-bottom: 10px;">
          <strong>COMMERCIAL:</strong><br>
          ${commercial.name}<br>
          ${commercial.phone || ''}
        </div>

        <div class="separator"></div>

        <div style="margin-bottom: 10px;">
          <strong>ARTICLES:</strong>
        </div>

        ${articles.map(item => `
          <div class="article-item">
            <div class="article-name">${item.article.commercialName || item.article.name}</div>
            <div class="article-details">
              ${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')} = ${item.totalPrice.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        `).join('')}

        <div class="separator"></div>

        <div class="row total-row">
          <span>TOTAL:</span>
          <span>${distribution.totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div class="row total-row">
          <span>MISE JOURNALIÈRE:</span>
          <span>${distribution.dailyPayment.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div class="separator"></div>

        <div class="footer">
          Merci pour votre confiance!<br>
          Payez régulièrement vos mises
        </div>
      </body>
      </html>
    `;
  }

  private async savePDFToDevice(htmlContent: string, filename: string): Promise<string> {
    // This would require a PDF generation plugin like cordova-plugin-pdf-generator
    // For now, return a mock path
    const timestamp = new Date().getTime();
    const pdfFilename = `distribution_${filename}_${timestamp}.pdf`;
    const pdfPath = `Documents/${pdfFilename}`;

    // TODO: Implement actual PDF generation and saving
    console.log('PDF would be saved to:', pdfPath);
    console.log('HTML content:', htmlContent);

    return pdfPath;
  }

  printRecoveryReceipt(recovery: Recovery, distribution: Distribution, client: Client): Observable<PrintResult> {
    // For now, we just generate the HTML and open the print dialog
    const htmlContent = this.generateRecoveryReceiptHTML(recovery, distribution, client);
    this.openPrintDialog(htmlContent);
    return of({ success: true, message: 'Fenêtre d\'impression ouverte' });
  }

  private openPrintDialog(htmlContent: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  private generateRecoveryReceiptHTML(recovery: Recovery, distribution: Distribution, client: Client): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Recouvrement</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: 300px;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-row {
            font-weight: bold;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ELYKIA COMMERCIAL<br>
          REÇU DE RECOUVREMENT
        </div>

        <div class="separator"></div>

        <div class="row">
          <span>Client:</span>
          <span>${client.fullName}</span>
        </div>
        <div class="row">
          <span>Réf. Distribution:</span>
          <span>${distribution.reference}</span>
        </div>
        <div class="row">
          <span>Date:</span>
          <span>${new Date(recovery.paymentDate).toLocaleDateString('fr-FR')}</span>
        </div>

        <div class="separator"></div>

        <div class="row total-row">
          <span>Montant Payé:</span>
          <span>${recovery.amount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div class="row">
          <span>Nouveau Solde:</span>
          <span>${distribution.remainingAmount?.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div class="separator"></div>

        <div class="footer">
          Merci pour votre fidélité!
        </div>
      </body>
      </html>
    `;
  }

  checkPrinterStatus(): Observable<boolean> {
    return from(this.checkPrinterStatusAsync());
  }

  private async checkPrinterStatusAsync(): Promise<boolean> {
    if (!this.isBluetoothAvailable) {
      return false;
    }

    try {
      const printers = await this.discoverBluetoothPrinters();
      return printers.length > 0;
    } catch (error) {
      return false;
    }
  }

  async disconnectPrinter(): Promise<void> {
    if (this.connectedPrinter && this.isBluetoothAvailable) {
      try {
        // @ts-ignore
        await window.BluetoothPrinter.disconnect();
        this.connectedPrinter = null;
      } catch (error) {
        console.error('Error disconnecting printer:', error);
      }
    }
  }
}

