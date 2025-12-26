import { Injectable } from '@angular/core';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
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

export interface PrintableRecovery {
  recovery: Recovery;
  distribution: Distribution;
  client: Client;
  commercial: {
    name: string;
    phone?: string;
  };
}

export interface PrintableTontineCollection {
  collection: {
    id: string;
    amount: number;
    date: string;
  };
  member: {
    frequency: string;
    amount: number; // Expected amount
  };
  client: {
    fullName: string;
    phone?: string;
  };
  session: {
    year: number;
  };
  commercial: {
    name: string;
  };
  totalToDate: number;
}

export interface PrintableTontineDelivery {
  delivery: {
    id: string;
    requestDate: string;
    deliveryDate?: string;
    totalAmount: number;
  };
  items: Array<{
    articleName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  client: {
    fullName?: string;
    phone?: string;
  };
  session: {
    year: number;
  };
  commercial: {
    name: string;
  };
  totalBudget: number;
  remainingBudget: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrintingService {

  constructor() { }

  async printReceipt(printableDistribution: PrintableDistribution): Promise<void> {
    const htmlContent = this.generateReceiptHTML(printableDistribution);
    await Printer.print({
      content: htmlContent,
      name: `recu_${printableDistribution.distribution.reference}`
    });
  }

  async printRecoveryReceipt(printableRecovery: PrintableRecovery): Promise<void> {
    const htmlContent = this.generateRecoveryReceiptHTML(printableRecovery);
    await Printer.print({
      content: htmlContent,
      name: `recu_recouvrement_${printableRecovery.recovery.id}`
    });
  }

  async printTontineReceipt(data: PrintableTontineCollection): Promise<void> {
    const htmlContent = this.generateTontineReceiptHTML(data);
    await Printer.print({
      content: htmlContent,
      name: `recu_tontine_${data.collection.id}`
    });
  }

  private generateRecoveryReceiptHTML(printableRecovery: PrintableRecovery): string {
    const { recovery, distribution, client, commercial } = printableRecovery;
    const oldBalance = (distribution.remainingAmount ?? 0) + recovery.amount;
    const uniqueId = `#EL${new Date(recovery.paymentDate).getTime().toString()}`;
    const remainingInstallments = distribution.dailyPayment > 0
      ? Math.ceil((distribution.remainingAmount ?? 0) / distribution.dailyPayment)
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Reçu de Recouvrement</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print { @page { margin: 1mm; } }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 8px;
            line-height: 1.4;
            /* SOLUTION 1: Largeur réduite. Essayez 56mm ou 55mm */
            width: 56mm;
          }
          .header, .separator, .footer { text-align: center; }
          .header { font-size: 7px; margin-bottom: 20px; }
          .separator { border-top: 1px dashed #000; margin: 10px 0; }
          .footer { margin-top: 20px; font-size: 9px; }
          .content-wrapper { margin: 0 2mm; }

          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          /* SOLUTION 2: Forcer la valeur à ne pas être coupée */
          .row .value {
            white-space: nowrap;
            padding-left: 5px; /* Ajoute un petit espace de sécurité */
          }
          .total-row {font-size: 7px; }
        </style>
      </head>
      <body>

        <div class="header">
          AMENOUVEVE-YAVEH<br>
          RECU DE RECOUVREMENT
        </div><br>
        <p>--------------------------</p>

        <div class="separator"></div><br>

        <div class="content-wrapper">
          <div class="row">
            <span>Date:</span>
            <span class="value">${new Date(recovery.paymentDate).toLocaleString('fr-FR')}</span>
          </div>
         <div style="margin-bottom: 10px;">
            CLIENT:<br>
            ${client.fullName || (client.firstname + ' ' + client.lastname)}<br>
            ${client.phone || ''}
          </div>
          <div style="margin-bottom: 10px;">
            COMMERCIAL:      ${commercial.name}
          </div>
          <div class="row">
            <span>Credit Ref:</span>
            <span class="value">${distribution.reference}</span>
          </div>
        </div>

        <div class="separator"></div>
        <p>---------------------------</p>

        <div class="content-wrapper">
          <div class="row">
            <span>Ancien Solde:</span>
            <span class="value">${oldBalance.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <p>---------------------------</p>
          <div class="row total-row">
            <span>Montant Paye:</span>
            <span class="value">${recovery.amount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <p>---------------------------</p>
          <div class="row">
            <span>Nouveau Solde:</span>
            <span class="value">${(distribution.remainingAmount ?? 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="row">
            <span>Mise journalier:</span>
            <span class="value">${(distribution.dailyPayment ?? 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="row">
            <span>Nbr. de mises restantes:</span>
            <span class="value">${remainingInstallments}</span>
          </div>
        </div><br>

        <div class="separator"></div><br>
        <p>---------------------------</p>

        <div class="footer">
          <p>Merci pour votre fidelite!</p>
          <p>AMENOUVEVE-YAVEH,</p>
          <p>votre partenaire de confiance.</p>
                  ${uniqueId}<br>
        </div>
      </body>
      </html>
    `;
  }

  private generateReceiptHTML(printableDistribution: PrintableDistribution): string {
    const { distribution, client, articles, commercial } = printableDistribution;
    const uniqueId = `#EL${new Date(distribution.createdAt).getTime().toString()}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Recu de Distribution</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print { @page { margin: 1mm; } }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 6px;
            line-height: 1.4;
            /* SOLUTION 1: Largeur réduite. Essayez 56mm ou 55mm */
            width: 56mm;
          }
          .header, .separator, .footer { text-align: center; }
          .header { font-size: 7px; margin-bottom: 20px; }
          .separator { border-top: 1px dashed #000; margin: 10px 0; }
          .footer { margin-top: 20px; font-size: 8px; }
          .content-wrapper { margin: 0 2mm; }

          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          /* SOLUTION 2: Forcer la valeur à ne pas être coupée */
          .row .value {
            white-space: nowrap;
            padding-left: 5px; /* Ajoute un petit espace de sécurité */
          }

          .article-item { margin-bottom: 8px; }
          .article-name { margin-bottom: 2px; }
          .article-details {
            font-size: 6px;
            color: #333;
          }
          .article-total {
          }
        </style>
      </head>
      <body>
        <div class="header">
          AMENOUVEVE-YAVEH<br>
          RECU DE DISTRIBUTION
        </div>
        <p>----------------------------</p>
        <div class="separator"></div>

        <div class="content-wrapper">
          <div class="row">
            <span>Reference:</span>
            <span class="value">${distribution.reference || 'N/A'}</span>
          </div>
          <div class="row">
            <span>Date:</span>
            <span class="value">${new Date(distribution.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="row">
            <span>Heure:</span>
            <span class="value">${new Date(distribution.createdAt).toLocaleTimeString('fr-FR')}</span>
          </div>
        </div>

        <div class="separator"></div>
        <div class="content-wrapper">
          <div style="margin-bottom: 10px;">
            CLIENT:<br>
            ${client.code}<br>
            ${client.firstname} ${client.lastname}<br>
            ${client.address || ''}<br>
            ${client.phone || ''}
          </div>

          <div style="margin-bottom: 10px;">
            COMMERCIAL: ${commercial.name}

          </div>
        </div><br>
        <div class="separator"></div>

        <div class="content-wrapper">
          <div style="margin-bottom: 10px;">ARTICLES:</div>
          ${articles.map(item => `
            <div class="article-item">
              <div class="article-name">${item.article.commercialName || item.article.name}</div>
              <div class="row article-details">
                <span>${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')}</span>
                <span class="article-total">${item.totalPrice.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="separator"></div>
        <p>----------------------------</p>

        <div class="content-wrapper">
          <div class="row total-row">

            <span>TOTAL:</span>
            <span class="value">${distribution.totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <p>----------------------------</p>
          <div class="row total-row">
            <span>MISE JOURNALIERE:</span>
            <span class="value">${distribution.dailyPayment.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="row">
            <span>AVANCE:</span>
            <span class="value">${(distribution.advance || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="row total-row">
            <span>NOUVEAU SOLDE:</span>
            <span class="value">${(distribution.remainingAmount || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div><br>
        <p>----------------------------</p>

        <div class="separator"></div>
        <div class="footer">
          <p>Merci pour votre confiance!</p>
          <p>Payez regulierement vos mises</p>
                !!!AMENOUVEVE-YAHVE!!!<br>
                  <p>${uniqueId}</p>
        </div>

      </body>
      </html>
    `;
  }

  private generateTontineReceiptHTML(data: PrintableTontineCollection): string {
    const { collection, member, client, session, commercial, totalToDate } = data;
    const uniqueId = `#TON${new Date(collection.date).getTime().toString().slice(-6)}`;
    const collectionDate = new Date(collection.date);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Reçu Tontine</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print { @page { margin: 1mm; } }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 8px;
            line-height: 1.4;
            width: 56mm;
          }
          .header, .separator, .footer { text-align: center; }
          .header { font-size: 9px; font-weight: bold; margin-bottom: 10px; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          .footer { margin-top: 15px; font-size: 8px; }
          .content-wrapper { margin: 0 2mm; }

          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .row .value {
            white-space: nowrap;
            padding-left: 5px;
            font-weight: bold;
          }
          .amount-box {
            border: 1px solid #000;
            padding: 5px;
            margin: 10px 0;
            text-align: center;
          }
          .amount-label { font-size: 7px; }
          .amount-value { font-size: 12px; font-weight: bold; }
          .total-row { font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>

        <div class="header">
          AMENOUVEVE-YAVEH<br>
          RECU TONTINE
        </div>
        <div style="text-align: center; font-size: 7px;">
          Session ${session.year}
        </div>
        
        <div class="separator"></div>

        <div class="content-wrapper">
          <div class="row">
            <span>Date:</span>
            <span class="value">${collectionDate.toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="row">
            <span>Heure:</span>
            <span class="value">${collectionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          <div style="margin: 8px 0;">
            <strong>CLIENT:</strong><br>
            ${client.fullName}<br>
            ${client.phone || ''}
          </div>

          <div class="row">
            <span>Fréquence:</span>
            <span class="value">${member.frequency || 'N/A'}</span>
          </div>
          <div class="row">
            <span>Commercial:</span>
            <span class="value">${commercial.name}</span>
          </div>
        </div>

        <div class="separator"></div>

        <div class="content-wrapper">
          <div class="amount-box">
            <div class="amount-label">MONTANT VERSE</div>
            <div class="amount-value">${collection.amount.toLocaleString('fr-FR')} FCFA</div>
          </div>

          <div class="row total-row">
            <span>TOTAL EPARGNE:</span>
            <span class="value">${totalToDate.toLocaleString('fr-FR')} FCFA</span>
          </div>
          
          <div class="row">
            <span>Mise attendue:</span>
            <span class="value">${(member.amount || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div class="separator"></div>

        <div class="footer">
          <p>Merci pour votre confiance!</p>
          <p>Conservez ce reçu précieusement.</p>
          <br>
          <p>${uniqueId}</p>
        </div>
      </body>
      </html>
    `;
  }

  async printTontineDeliveryReceipt(data: PrintableTontineDelivery): Promise<void> {
    const htmlContent = this.generateTontineDeliveryReceiptHTML(data);
    await Printer.print({
      content: htmlContent,
      name: `recu_livraison_tontine_${data.delivery.id}`
    });
  }

  private generateTontineDeliveryReceiptHTML(data: PrintableTontineDelivery): string {
    const { delivery, items, client, session, commercial, totalBudget, remainingBudget } = data;
    const deliveryDateStr = delivery.deliveryDate || delivery.requestDate;
    const uniqueId = `#LIV${new Date(deliveryDateStr).getTime().toString().slice(-6)}`;
    const deliveryDate = new Date(deliveryDateStr);

    const itemsHTML = items.map(item => `
      <div style="margin-bottom: 6px; padding: 4px; background: #f5f5f5; border-left: 2px solid #000;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${item.articleName}</span>
          <span>x${item.quantity}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 7px; margin-top: 2px;">
          <span>${item.unitPrice.toLocaleString('fr-FR')} FCFA/u</span>
          <span style="font-weight: bold;">${item.totalPrice.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Reçu Livraison Tontine</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print { @page { margin: 1mm; } }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 8px;
            line-height: 1.4;
            width: 56mm;
          }
          .header, .separator, .footer { text-align: center; }
          .header { font-size: 9px; font-weight: bold; margin-bottom: 10px; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          .footer { margin-top: 15px; font-size: 8px; }
          .content-wrapper { margin: 0 2mm; }

          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .row .value {
            white-space: nowrap;
            padding-left: 5px;
            font-weight: bold;
          }
          .total-box {
            border: 2px solid #000;
            padding: 6px;
            margin: 10px 0;
            text-align: center;
          }
          .total-label { font-size: 7px; }
          .total-value { font-size: 12px; font-weight: bold; }
          .budget-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 3px 0;
            border-bottom: 1px dashed #ccc;
          }
          .budget-row.highlight {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>

        <div class="header">
          AMENOUVEVE-YAVEH<br>
          RECU DE LIVRAISON<br>
          TONTINE FIN D'ANNEE
        </div>
        <div style="text-align: center; font-size: 7px;">
          Session ${session.year}
        </div>
        
        <div class="separator"></div>

        <div class="content-wrapper">
          <div class="row">
            <span>Date livraison:</span>
            <span class="value">${deliveryDate.toLocaleDateString('fr-FR')}</span>
          </div>
          
          <div style="margin: 8px 0;">
            <strong>BENEFICIAIRE:</strong><br>
            ${client.fullName || 'Client'}<br>
            ${client.phone || ''}
          </div>

          <div class="row">
            <span>Commercial:</span>
            <span class="value">${commercial.name}</span>
          </div>
        </div>

        <div class="separator"></div>

        <div class="content-wrapper">
          <div style="font-weight: bold; margin-bottom: 6px; text-align: center;">
            ARTICLES LIVRES
          </div>
          ${itemsHTML}
        </div>

        <div class="separator"></div>

        <div class="content-wrapper">
          <div style="background: #f5f5f5; padding: 6px; margin-bottom: 8px;">
            <div class="budget-row">
              <span>Total Epargne:</span>
              <span>${totalBudget.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div class="budget-row">
              <span>Total Livraison:</span>
              <span>${delivery.totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div class="budget-row highlight">
              <span>Restant:</span>
              <span>${remainingBudget.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          <div class="total-box">
            <div class="total-label">VALEUR TOTALE</div>
            <div class="total-value">${delivery.totalAmount.toLocaleString('fr-FR')} FCFA</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="footer">
          <p>Merci pour votre confiance!</p>
          <p>Bonne fin d'annee!</p>
          <br>
          <p>${uniqueId}</p>
        </div>
      </body>
      </html>
    `;
  }
}
