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
      isSync: boolean;
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
      isSync: boolean;
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
      isSync: boolean;
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
  tontineMembers?: {
    count: number;
    items: Array<{
      time: string;
      memberName: string;
      details: string;
      contribution: number;
      isSync: boolean;
    }>;
  };
  tontineCollections?: {
    count: number;
    totalAmount: number;
    items: Array<{
      time: string;
      memberName: string;
      details: string;
      amount: number;
      isSync: boolean;
    }>;
  };
  tontineDeliveries?: {
    count: number;
    totalAmount: number;
    items: Array<{
      time: string;
      memberName: string;
      details: string;
      amount: number;
      isSync: boolean;
    }>;
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
              amount: d.totalAmount,
              isSync: d.isSync || false
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
              amount: r.amount,
              isSync: r.isSync || false
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
          balance: acc.accountBalance || 0,
          isSync: acc.isSync || false
        }));

        const updatedAccountItems = todayUpdatedAccounts.map((acc: Account) => ({
          time: acc.syncDate ? new Date(acc.syncDate).toLocaleTimeString('fr-FR') : '',
          clientName: clientMap.get(acc.clientId) || 'Client inconnu',
          accountNumber: acc.accountNumber || 'N/A',
          balance: (acc.accountBalance || 0) - (acc.old_balance || 0),
          isSync: acc.isSync || false
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
   * Charge les données des membres tontine du jour (lazy loading)
   */


  /**
   * Charge les données des collectes tontine du jour (lazy loading)
   */
  getTontineCollectionsData(date?: Date): Observable<{ count: number; totalAmount: number; items: any[] }> {
    if (!this.commercialUsername) {
      return of({ count: 0, totalAmount: 0, items: [] });
    }
    const currentCommercialId = this.commercialUsername;
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    return from(this.databaseService.getTontineCollectionsByCommercial(currentCommercialId)).pipe(
      switchMap(collections => {
        const todayCollections = collections.filter(c => c.collectionDate && c.collectionDate.startsWith(dateString));
        if (todayCollections.length === 0) {
          return of({ count: 0, totalAmount: 0, items: [] });
        }
        return from(this.databaseService.getTontineMembers('', currentCommercialId)).pipe(
          map(members => {
            const memberMap = new Map(members.map(m => [m.id, m.name || m.clientName]));
            const items = todayCollections.map(c => ({
              time: c.collectionDate ? new Date(c.collectionDate).toLocaleTimeString('fr-FR') : '',
              memberName: memberMap.get(c.tontineMemberId) || 'Membre inconnu',
              details: `Collecte #${c.id.substring(0, 8)}`,
              amount: c.amount || 0,
              isSync: c.isSync || false
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return { count: items.length, totalAmount, items };
          })
        );
      })
    );
  }

  /**
   * Charge les données des livraisons tontine du jour (lazy loading)
   */
  getTontineDeliveriesData(date?: Date): Observable<{ count: number; totalAmount: number; items: any[] }> {
    if (!this.commercialUsername) {
      return of({ count: 0, totalAmount: 0, items: [] });
    }
    const currentCommercialId = this.commercialUsername;
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    return from(this.databaseService.getTontineDeliveries('', currentCommercialId)).pipe(
      switchMap(deliveries => {
        const todayDeliveries = deliveries.filter(d => d.requestDate && d.requestDate.startsWith(dateString));
        if (todayDeliveries.length === 0) {
          return of({ count: 0, totalAmount: 0, items: [] });
        }
        return from(this.databaseService.getTontineMembers('', currentCommercialId)).pipe(
          map(members => {
            const memberMap = new Map(members.map(m => [m.id, m.name || m.clientName]));
            const items = todayDeliveries.map(d => ({
              time: d.requestDate ? new Date(d.requestDate).toLocaleTimeString('fr-FR') : '',
              memberName: memberMap.get(d.tontineMemberId) || 'Membre inconnu',
              details: `Livraison #${d.id.substring(0, 8)}`,
              amount: d.totalAmount || 0,
              isSync: d.isSync || false
            }));
            const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
            return { count: items.length, totalAmount, items };
          })
        );
      })
    );
  }

  /**
   * Charge uniquement le count des tontines pour l'affichage initial des badges
   */
  getTontineCountsOnly(date?: Date): Observable<{ members: number; collections: number; deliveries: number }> {
    if (!this.commercialUsername) {
      return of({ members: 0, collections: 0, deliveries: 0 });
    }
    const currentCommercialId = this.commercialUsername;
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    const membersCount$ = from(this.databaseService.getTontineMembers('', currentCommercialId)).pipe(
      map(members => members.filter(m => m.registrationDate && m.registrationDate.startsWith(dateString)).length)
    );

    const collectionsCount$ = from(this.databaseService.getTontineCollectionsByCommercial(currentCommercialId)).pipe(
      map(collections => collections.filter(c => c.collectionDate && c.collectionDate.startsWith(dateString)).length)
    );

    const deliveriesCount$ = from(this.databaseService.getTontineDeliveries('', currentCommercialId)).pipe(
      map(deliveries => deliveries.filter(d => d.requestDate && d.requestDate.startsWith(dateString)).length)
    );

    return forkJoin({
      members: membersCount$,
      collections: collectionsCount$,
      deliveries: deliveriesCount$
    });
  }

  /**
   * Charge toutes les données du rapport pour la génération PDF
   * (Inclut les données des onglets lazy-loaded)
   */
  getDailyReportWithDetails(date?: Date): Observable<DailyReportData> {
    const targetDate = date || new Date();

    return forkJoin({
      baseReport: this.getDailyReport(targetDate),
      tontineMembers: this.getTontineMembersData(targetDate),
      tontineCollections: this.getTontineCollectionsData(targetDate),
      tontineDeliveries: this.getTontineDeliveriesData(targetDate)
    }).pipe(
      map(({ baseReport, tontineMembers, tontineCollections, tontineDeliveries }) => {
        // Fusionner les données
        return {
          ...baseReport,
          tontineMembers,
          tontineCollections,
          tontineDeliveries
        };
      })
    );
  }

  /**
   * Charge les données des membres tontine du jour (lazy loading)
   */
  getTontineMembersData(date?: Date): Observable<{ count: number; items: any[] }> {
    if (!this.commercialUsername) {
      return of({ count: 0, items: [] });
    }
    const currentCommercialId = this.commercialUsername;
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    return from(this.databaseService.getTontineMembers('', currentCommercialId)).pipe(
      switchMap(members => {
        // DIAGNOSTIC LOGS
        console.log(`[RapportJournalier] Filtering members for date: ${dateString}`);
        console.log(`[RapportJournalier] Total members found: ${members.length}`);
        if (members.length > 0) {
          console.log(`[RapportJournalier] Sample member date: ${members[0].registrationDate}`);
        }

        const todayMembers = members.filter(m => m.registrationDate && m.registrationDate.startsWith(dateString));

        console.log(`[RapportJournalier] Members match count: ${todayMembers.length}`);

        if (todayMembers.length === 0) {
          return of({ count: 0, items: [] });
        }
        const items = todayMembers.map(m => ({
          time: m.registrationDate ? new Date(m.registrationDate).toLocaleTimeString('fr-FR') : '',
          memberName: m.name || m.clientName || 'Membre inconnu',
          details: `Contribution: ${m.totalContribution || 0} FCFA`,
          contribution: m.totalContribution || 0,
          isSync: m.isSync || false
        }));
        return of({ count: items.length, items });
      })
    );
  }

  /**
   * ==================================================================
   * GÉNÉRATION HTML POUR PDF (FORMAT COMPLET AVEC TABLEAUX)
   * ==================================================================
   */
  generatePDFHTML(reportData: DailyReportData): string {
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formatPrice = (amount: number) => amount.toLocaleString('fr-FR');

    // Générer les tableaux pour chaque entité
    const distributionsTable = this.generateTableHTML(
      'Distributions',
      ['ID', 'Heure', 'Client', 'Détails', 'Montant', 'Statut'],
      reportData.distributions.items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.time,
        item.clientName,
        item.details,
        `${formatPrice(item.amount)} FCFA`,
        item.isSync ? 'Sync' : 'Local'
      ])
    );

    const recoveriesTable = this.generateTableHTML(
      'Recouvrements',
      ['ID', 'Heure', 'Client', 'Détails', 'Montant', 'Statut'],
      reportData.recoveries.items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.time,
        item.clientName,
        item.details,
        `${formatPrice(item.amount)} FCFA`,
        item.isSync ? 'Sync' : 'Local'
      ])
    );

    const clientsTable = this.generateTableHTML(
      'Nouveaux Clients',
      ['ID', 'Heure', 'Nom', 'N° Compte', 'Solde', 'Statut'],
      reportData.newClients.items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.time,
        item.clientName,
        item.accountNumber,
        `${formatPrice(item.balance)} FCFA`,
        item.isSync ? 'Sync' : 'Local'
      ])
    );

    const tontineMembersTable = reportData.tontineMembers && reportData.tontineMembers.items.length > 0
      ? this.generateTableHTML(
        'Membres Tontine',
        ['ID', 'Heure', 'Nom', 'Détails', 'Contribution', 'Statut'],
        reportData.tontineMembers.items.map((item: any, index: number) => [
          (index + 1).toString(),
          item.time,
          item.memberName,
          item.details,
          `${formatPrice(item.contribution)} FCFA`,
          item.isSync ? 'Sync' : 'Local'
        ])
      )
      : '';

    const tontineCollectionsTable = reportData.tontineCollections && reportData.tontineCollections.items.length > 0
      ? this.generateTableHTML(
        'Collectes Tontine',
        ['ID', 'Heure', 'Membre', 'Détails', 'Montant', 'Statut'],
        reportData.tontineCollections.items.map((item: any, index: number) => [
          (index + 1).toString(),
          item.time,
          item.memberName,
          item.details,
          `${formatPrice(item.amount)} FCFA`,
          item.isSync ? 'Sync' : 'Local'
        ])
      )
      : '';

    const tontineDeliveriesTable = reportData.tontineDeliveries && reportData.tontineDeliveries.items.length > 0
      ? this.generateTableHTML(
        'Livraisons Tontine',
        ['ID', 'Heure', 'Membre', 'Détails', 'Montant', 'Statut'],
        reportData.tontineDeliveries.items.map((item: any, index: number) => [
          (index + 1).toString(),
          item.time,
          item.memberName,
          item.details,
          `${formatPrice(item.amount)} FCFA`,
          item.isSync ? 'Sync' : 'Local'
        ])
      )
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Rapport Journalier - ${reportData.date}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #003366;
          }
          .header h1 {
            margin: 0;
            font-size: 24pt;
            color: #003366;
            text-transform: uppercase;
          }
          .header p {
            margin: 5px 0;
            font-size: 11pt;
            color: #666;
          }
          .kpi-section {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .kpi-section h2 {
            margin: 0 0 15px 0;
            font-size: 14pt;
            color: #003366;
            text-transform: uppercase;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .kpi-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          .kpi-label {
            font-weight: bold;
            color: #555;
          }
          .kpi-value {
            color: #003366;
            font-weight: bold;
          }
          .total-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #003366;
          }
          .total-item {
            display: flex;
            justify-content: space-between;
            font-size: 14pt;
            font-weight: bold;
            color: #003366;
          }
          .table-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .table-section h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            color: #003366;
            text-transform: uppercase;
            border-bottom: 2px solid #003366;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            background: #003366;
            color: white;
            padding: 8px;
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
          }
          td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
            font-size: 9pt;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .status-local {
            color: #757575;
            font-weight: bold;
          }
          .status-sync {
            color: #4CAF50;
            font-weight: bold;
          }
          .empty-message {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 20px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9pt;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- En-tête -->
          <div class="header">
            <h1>Rapport Journalier</h1>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Commercial:</strong> ${reportData.commercialName}</p>
          </div>

          <!-- Section KPI -->
          <div class="kpi-section">
            <h2>Résumé du Jour</h2>
            <div class="kpi-grid">
              <div class="kpi-item">
                <span class="kpi-label">Distributions:</span>
                <span class="kpi-value">${reportData.distributions.count} (${formatPrice(reportData.distributions.totalAmount)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Recouvrements:</span>
                <span class="kpi-value">${reportData.recoveries.count} (${formatPrice(reportData.recoveries.totalAmount)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Nouveaux Clients:</span>
                <span class="kpi-value">${reportData.newClients.count} (${formatPrice(reportData.newClients.totalBalance)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Avances:</span>
                <span class="kpi-value">${reportData.advances.count} (${formatPrice(reportData.advances.totalAmount)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Tontine:</span>
                <span class="kpi-value">${reportData.tontine.count} (${formatPrice(reportData.tontine.totalAmount)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Membres Tontine:</span>
                <span class="kpi-value">${reportData.tontineMembers?.count || 0}</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Collectes Tontine:</span>
                <span class="kpi-value">${reportData.tontineCollections?.count || 0} (${formatPrice(reportData.tontineCollections?.totalAmount || 0)} FCFA)</span>
              </div>
              <div class="kpi-item">
                <span class="kpi-label">Livraisons Tontine:</span>
                <span class="kpi-value">${reportData.tontineDeliveries?.count || 0} (${formatPrice(reportData.tontineDeliveries?.totalAmount || 0)} FCFA)</span>
              </div>
            </div>
            <div class="total-section">
              <div class="total-item">
                <span>TOTAL À PAYER:</span>
                <span>${formatPrice(reportData.totalToPay)} FCFA</span>
              </div>
            </div>
          </div>

          <!-- Tableaux détaillés -->
          ${distributionsTable}
          ${recoveriesTable}
          ${clientsTable}
          ${tontineMembersTable}
          ${tontineCollectionsTable}
          ${tontineDeliveriesTable}

          <!-- Pied de page -->
          <div class="footer">
            <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
            <p>© ELYKIA - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Génère un tableau HTML pour une entité
   */
  private generateTableHTML(title: string, headers: string[], rows: string[][]): string {
    if (rows.length === 0) {
      return `
        <div class="table-section">
          <h3>${title}</h3>
          <div class="empty-message">Aucune donnée disponible</div>
        </div>
      `;
    }

    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const dataRows = rows.map(row => {
      const cells = row.map((cell, index) => {
        // Appliquer un style spécial pour la colonne Statut
        if (index === row.length - 1) {
          const cssClass = cell === 'Sync' ? 'status-sync' : 'status-local';
          return `<td class="${cssClass}">${cell}</td>`;
        }
        return `<td>${cell}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div class="table-section">
        <h3>${title}</h3>
        <table>
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </div>
    `;
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
