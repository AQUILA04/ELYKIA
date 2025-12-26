import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DatabaseService } from '../../../core/services/database.service';
import { Distribution } from 'src/app/models/distribution.model';
import { Recovery } from 'src/app/models/recovery.model';
import { Client } from 'src/app/models/client.model';
import { Account } from 'src/app/models/account.model';
import { Commercial } from 'src/app/models/commercial.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../../store/auth/auth.selectors';

export interface DailyReportData {
  date: string;
  commercialName: string;
  totalToPay: number;
  distributions: {
    count: number;
    totalAmount: number;
    items: Array<{
      time: string;
      clientName: string;
      details: string;
      amount: number;
    }>;
  };
  recoveries: {
    count: number;
    totalAmount: number;
    items: Array<{
      time: string;
      clientName: string;
      details: string;
      amount: number;
    }>;
  };
  newClients: {
    count: number;
    totalBalance: number;
    items: Array<{
      time: string;
      clientName: string;
      accountNumber: string;
      balance: number;
    }>;
  };
  advances: {
    count: number;
    totalAmount: number;
  };
  tontine: {
    count: number;
    totalAmount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RapportJournalierService {
  private commercialUsername: string | undefined;

  constructor(private databaseService: DatabaseService,
    private store: Store
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  getDailyReport(date?: Date): Observable<DailyReportData> {
    if (!this.commercialUsername) {
      console.error('RapportJournalierService: Commercial username not available.');
      return of({
        date: '',
        commercialName: 'N/A',
        totalToPay: 0,
        distributions: { count: 0, totalAmount: 0, items: [] },
        recoveries: { count: 0, totalAmount: 0, items: [] },
        newClients: { count: 0, totalBalance: 0, items: [] },
        advances: { count: 0, totalAmount: 0 },
        tontine: { count: 0, totalAmount: 0 }
      }); // Return a default empty report
    }
    const currentCommercialId = this.commercialUsername;
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    const commercial$: Observable<Commercial | null> = from(this.databaseService.getCommercial());

    const distributions$ = from(this.databaseService.getDistributions(currentCommercialId)).pipe(
      switchMap(distributions => {
        const todayDistributions = distributions.filter(d => d.createdAt && d.createdAt.startsWith(dateString));
        if (todayDistributions.length === 0) {
          return of({ count: 0, totalAmount: 0, items: [] });
        }
        return from(this.databaseService.getClients(currentCommercialId)).pipe(
          map(clients => {
            const clientMap = new Map(clients.map(c => [c.id, c.fullName]));
            const items = todayDistributions.map(d => ({
              time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('fr-FR') : '',
              clientName: clientMap.get(d.clientId) || 'Client inconnu',
              details: `Distribution #${d.reference}`,
              amount: d.totalAmount
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return {
              count: items.length,
              totalAmount: totalAmount,
              items: items
            };
          })
        );
      })
    );

    const recoveries$ = from(this.databaseService.getRecoveries(currentCommercialId)).pipe(
      switchMap(recoveries => {
        const todayRecoveries = recoveries.filter(r => r.createdAt && r.createdAt.startsWith(dateString));
        if (todayRecoveries.length === 0) {
          return of({ count: 0, totalAmount: 0, items: [] });
        }
        return from(this.databaseService.getClients(currentCommercialId)).pipe(
          map(clients => {
            const clientMap = new Map(clients.map(c => [c.id, c.fullName]));
            const items = todayRecoveries.map(r => ({
              time: new Date(r.createdAt).toLocaleTimeString('fr-FR'),
              clientName: clientMap.get(r.clientId) || 'Client inconnu',
              details: `Recouvrement #${r.id}`,
              amount: r.amount
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return {
              count: items.length,
              totalAmount: totalAmount,
              items: items
            };
          })
        );
      })
    );

    const newClients$ = forkJoin({
      accounts: from(this.databaseService.getAccounts(currentCommercialId)),
      clients: from(this.databaseService.getClients(currentCommercialId))
    }).pipe(
      map(({ accounts, clients }: { accounts: Account[], clients: Client[] }) => {
        const clientMap = new Map(clients.map(c => [c.id, c.fullName]));

        const todayNewAccounts = accounts.filter((a: Account) => a.createdAt && a.createdAt.startsWith(dateString));
        const todayUpdatedAccounts = accounts.filter((a: Account) => a.updated && a.old_balance && a.accountBalance > a.old_balance && a.syncDate && a.syncDate.startsWith(dateString));

        const newAccountsBalance = todayNewAccounts.reduce((sum: number, acc: Account) => sum + (acc.accountBalance || 0), 0);
        const updatedAccountsBalance = todayUpdatedAccounts.reduce((sum: number, acc: Account) => sum + ((acc.accountBalance || 0) - (acc.old_balance || 0)), 0);

        const totalBalance = newAccountsBalance + updatedAccountsBalance;

        const newAccountItems = todayNewAccounts.map((acc: Account) => ({
          time: acc.createdAt ? new Date(acc.createdAt).toLocaleTimeString('fr-FR') : '',
          clientName: clientMap.get(acc.clientId) || 'Client inconnu',
          accountNumber: acc.accountNumber || 'N/A',
          balance: acc.accountBalance || 0
        }));

        const updatedAccountItems = todayUpdatedAccounts.map((acc: Account) => ({
          time: acc.syncDate ? new Date(acc.syncDate).toLocaleTimeString('fr-FR') : '',
          clientName: clientMap.get(acc.clientId) || 'Client inconnu',
          accountNumber: acc.accountNumber || 'N/A',
          balance: (acc.accountBalance || 0) - (acc.old_balance || 0)
        }));

        const items = [...newAccountItems, ...updatedAccountItems];

        return {
          count: items.length,
          totalBalance: totalBalance,
          items: items
        };
      })
    );

    const advances$ = from(this.databaseService.getDistributions(currentCommercialId)).pipe(
      map((distributions: Distribution[]) => {
        const todayAdvances = distributions.filter((d: Distribution) =>
          d.createdAt && d.createdAt.startsWith(dateString) &&
          d.advance && d.advance > 0
        );

        const totalAmount = todayAdvances.reduce((sum: number, dist: Distribution) => sum + (dist.advance || 0), 0);

        return {
          count: todayAdvances.length,
          totalAmount: totalAmount
        };
      })
    );

    const tontine$ = from(this.databaseService.getTontineCollectionsByCommercial(currentCommercialId)).pipe(
      map((collections: any[]) => {
        const todayCollections = collections.filter(c => c.collectionDate && c.collectionDate.startsWith(dateString));
        const totalAmount = todayCollections.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        return {
          count: todayCollections.length,
          totalAmount: totalAmount
        };
      })
    );

    return forkJoin({
      commercial: commercial$,
      distributions: distributions$,
      recoveries: recoveries$,
      newClients: newClients$,
      advances: advances$,
      tontine: tontine$
    }).pipe(
      map((results: {
        commercial: Commercial | null;
        distributions: { count: number; totalAmount: number; items: any[] };
        recoveries: { count: number; totalAmount: number; items: any[] };
        newClients: { count: number; totalBalance: number; items: any[] };
        advances: { count: number; totalAmount: number };
        tontine: { count: number; totalAmount: number };
      }) => {
        const totalToPay = results.recoveries.totalAmount + results.advances.totalAmount + results.tontine.totalAmount;
        return {
          date: targetDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          commercialName: results.commercial?.fullName || 'N/A',
          totalToPay: totalToPay,
          distributions: results.distributions,
          recoveries: results.recoveries,
          newClients: results.newClients,
          advances: results.advances,
          tontine: results.tontine
        };
      })
    );
  }

  /**
   * ==================================================================
   * MÉTHODE MISE À JOUR POUR CORRESPONDRE AU FORMAT DU REÇU
   * ==================================================================
   */
  generateReportHTML(reportData: DailyReportData): string {
    const formattedDate = new Date().toLocaleDateString('fr-FR');
    const formattedTime = new Date().toLocaleTimeString('fr-FR');

    // Fonctions d'aide pour formater les montants
    const formatPrice = (amount: number) => amount.toLocaleString('fr-FR');
    const formatPriceWithCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;

    const uniqueId = `#EL${Date.now().toString()}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Rapport Journalier - ${reportData.date}</title>
        <style>
          body {
            font-family: 'Consolas', 'Menlo', 'Courier', monospace;
            width: 180px; /* Largeur typique d'un reçu thermique */
            font-size: 6px;
            line-height: 1.4;
            margin: 0;
            padding: 5px;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .header h3 {
            margin: 0;
            font-size: 7px;
            text-transform: uppercase;
          }
          .header p {
            margin: 2px 0;
            font-size: 7px;
          }
          .info {
            margin-bottom: 5px;
          }
          .info p {
            margin: 2px 0;
            text-transform: uppercase;
          }
          .separator {
            border-bottom: 1px dashed #000;
            margin: 8px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .item .name {
            text-transform: uppercase;
            padding-right: 10px;
            white-space: nowrap;
          }
          .item .price {
            text-align: right;
            white-space: nowrap;
          }
          .total {
            display: flex;
            justify-content: space-between;
            font-size: 6px;
            margin-top: 5px;
          }
          .total .name {
            text-transform: uppercase;
          }
          .total .price {
            text-align: right;
            white-space: nowrap;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 6px;
          }
          .footer p {
            margin: 2px 0;
          }
          .unique-id-text {
            margin-left: 20px;}
        </style>
      </head>
      <body>
        <div class="header">
          <h3>AMENOUVEVE-YAVEH</h3><br>
          <p>******RAPPORT JOURNALIER*****</p>
        </div>
        <p>-----------------------------</p>

        <div class="info">
          <p>DATE: ${reportData.date}</p>
          <p>COMMERCIAL: ${reportData.commercialName}</p>
        </div>

        <div class="separator"></div>

        <div class="item">
          <span class="name">RECOUV. (NB) :</span>
          <span class="price">${reportData.recoveries.count}</span>
        </div>
        <div class="item">
          <span class="name">RECOUV. (MONTANT) :</span>
          <span class="price">${formatPriceWithCurrency(reportData.recoveries.totalAmount)}</span>
        </div>
        <div class="item">
          <span class="name">NVX CLIENTS (NB) :</span>
          <span class="price">${reportData.newClients.count}</span>
        </div>
        <div class="item">
          <span class="name">NVX CLIENTS (MONTANT) :</span>
          <span class="price">${formatPriceWithCurrency(reportData.newClients.totalBalance)}</span>
        </div>
        <div class="item">
          <span class="name">AVANCES :</span>
          <span class="price">${formatPriceWithCurrency(reportData.advances.totalAmount)}</span>
        </div>

        <div class="separator"></div>

        <div class="item">
          <span class="name">DISTRIB. (NB) :</span>
          <span class="price">${reportData.distributions.count}</span>
        </div>
        <div class="item">
          <span class="name">DISTRIB. (MONTANT) :</span>
          <span class="price">${formatPriceWithCurrency(reportData.distributions.totalAmount)}</span>
        </div>
         <div class="separator"></div>
         <p>-----------------------------</p>
        <div class="total">
          <span class="name">TOTAL A VERSER :</span>
          <span class="price">${formatPriceWithCurrency(reportData.totalToPay)}</span>
        </div>
        <p>-------------------------------</p>

        <div class="separator"></div>

        <div class="footer">
          <p>Rapport genere le ${formattedDate} ${formattedTime}</p>
          <p class="unique-id-text">${uniqueId} <br></p>

        </div>
      </body>
      </html>
    `;
  }
}
