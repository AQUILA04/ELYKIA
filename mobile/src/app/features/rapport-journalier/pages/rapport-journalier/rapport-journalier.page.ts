import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAutomaticSyncStatus } from '../../../../store/sync/sync.selectors';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { PrintingService } from '../../../../core/services/printing.service';
import { RapportJournalierService, DailyReportData } from '../../services/rapport-journalier.service';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { IonBadge, IonButton, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSpinner, ToastController, LoadingController } from '@ionic/angular/standalone';
import { CommonModule, DecimalPipe, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, LOCALE_ID, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import { DatabaseService } from '../../../../core/services/database.service';
import * as html2pdf from 'html2pdf.js';
import { PdfReportService } from '../../../../core/services/pdf-report.service';
import { SyncStatus } from '../../../../models/sync.model';
import * as KpiActions from '../../../../store/kpi/kpi.actions';
import * as KpiSelectors from '../../../../store/kpi/kpi.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { map, take, filter, distinctUntilChanged, tap, withLatestFrom } from 'rxjs/operators';

// Store Imports
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import * as DistributionSelectors from '../../../../store/distribution/distribution.selectors';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import * as ClientActions from '../../../../store/client/client.actions';
import * as ClientSelectors from '../../../../store/client/client.selectors';
import * as TontineActions from '../../../../store/tontine/tontine.actions';
import * as TontineSelectors from '../../../../store/tontine/tontine.selectors';

// Register French locale data
registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

@Component({
  selector: 'app-rapport-journalier',
  templateUrl: './rapport-journalier.page.html',
  styleUrls: ['./rapport-journalier.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSpinner,
    ScrollingModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RapportJournalierPage implements OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  // Data for View from Store (Observables)
  distributions$: Observable<any[]> = of([]);
  recoveries$: Observable<any[]> = of([]);
  clients$: Observable<any[]> = of([]);
  tontineMembers$: Observable<any[]> = of([]);
  tontineCollections$: Observable<any[]> = of([]);
  tontineDeliveries$: Observable<any[]> = of([]);

  // Loading States
  loadingDistributions$: Observable<boolean> = of(false);
  loadingRecoveries$: Observable<boolean> = of(false);
  loadingClients$: Observable<boolean> = of(false);
  loadingTontineMembers$: Observable<boolean> = of(false);
  loadingTontineCollections$: Observable<boolean> = of(false);
  loadingTontineDeliveries$: Observable<boolean> = of(false);

  // Local Report Data (mainly for KPIs and Header)
  reportData: DailyReportData = {
    date: new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    commercialName: '',
    totalToPay: 0,
    distributions: { count: 0, totalAmount: 0, items: [] },
    recoveries: { count: 0, totalAmount: 0, items: [] },
    newClients: { count: 0, totalBalance: 0, items: [] },
    advances: { count: 0, totalAmount: 0 },
    tontine: { count: 0, totalAmount: 0 },
    tontineMembers: { count: 0, items: [] },
    tontineCollections: { count: 0, totalAmount: 0, items: [] },
    tontineDeliveries: { count: 0, totalAmount: 0, items: [] }
  };

  activeTab: 'distributions' | 'recouvrements' | 'clients' | 'tontine-membres' | 'tontine-collectes' | 'tontine-livraisons' = 'distributions';
  private subscriptions: Subscription = new Subscription();
  private loadedTabs: Set<string> = new Set();
  private commercialUsername: string | null = null;
  private tontineSessionId: string | null = null;

  constructor(
    private router: Router,
    private store: Store,
    private printingService: PrintingService,
    private rapportJournalierService: RapportJournalierService,
    private databaseService: DatabaseService,
    private pdfReportService: PdfReportService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeObservables();
  }

  private initializeObservables() {
    // Distributions Mapping
    this.distributions$ = this.store.select(DistributionSelectors.selectPaginatedDistributions).pipe(
      map(items => items.map(d => ({
        id: d.id,
        time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        clientName: d.clientName || 'Client inconnu',
        details: `Distribution #${d.reference || d.id.substring(0, 8)}`,
        amount: d.totalAmount,
        isSync: d.isSync
      })))
    );
    this.loadingDistributions$ = this.store.select(DistributionSelectors.selectDistributionPaginationLoading);

    // Recoveries Mapping
    this.recoveries$ = this.store.select(RecoverySelectors.selectPaginatedRecoveryViews).pipe(
      map(items => items.map(r => ({
        id: r.id,
        time: r.paymentDate ? new Date(r.paymentDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        clientName: r.clientName || 'Client inconnu',
        details: `Recouvrement`,
        amount: r.amount,
        isSync: r.isSync
      })))
    );
    this.loadingRecoveries$ = this.store.select(RecoverySelectors.selectRecoveryPaginationLoading);

    // Clients Mapping
    this.clients$ = this.store.select(ClientSelectors.selectPaginatedClientViews).pipe(
      map(items => items.map(c => ({
        id: c.id,
        time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        clientName: (c as any).firstname ? `${(c as any).firstname} ${(c as any).lastname}` : 'Client inconnu', // Client model has firstname/lastname
        accountNumber: c.account?.accountNumber || 'N/A',
        balance: c.account?.accountBalance || 0,
        isSync: c.isSync
      })))
    );
    this.loadingClients$ = this.store.select(ClientSelectors.selectClientPaginationLoading);

    // Tontine Members
    this.tontineMembers$ = this.store.select(TontineSelectors.selectPaginatedTontineMembers).pipe(
      map(items => items.map(m => ({
        id: m.id,
        time: m.registrationDate ? new Date(m.registrationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        memberName: (m as any).clientName || 'Membre inconnu',
        details: `Solde: ${m.totalContribution || 0} FCFA`,
        contribution: m.totalContribution || 0,
        isSync: m.isSync
      })))
    );
    this.loadingTontineMembers$ = this.store.select(TontineSelectors.selectTontineMemberPaginationLoading);

    // Tontine Collections
    this.tontineCollections$ = this.store.select(TontineSelectors.selectPaginatedTontineCollections).pipe(
      map(items => items.map(c => ({
        id: c.id,
        time: c.collectionDate ? new Date(c.collectionDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        memberName: (c as any).clientName || 'Membre inconnu',
        details: `Collecte`,
        amount: c.amount,
        isSync: c.isSync
      })))
    );
    this.loadingTontineCollections$ = this.store.select(TontineSelectors.selectTontineCollectionPaginationLoading);

    // Tontine Deliveries
    this.tontineDeliveries$ = this.store.select(TontineSelectors.selectPaginatedTontineDeliveries).pipe(
      map(items => items.map(d => ({
        id: d.id,
        time: d.requestDate ? new Date(d.requestDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        memberName: (d as any).clientName || 'Membre inconnu',
        details: `Livraison`,
        amount: d.totalAmount,
        isSync: d.isSync
      })))
    );
    this.loadingTontineDeliveries$ = this.store.select(TontineSelectors.selectTontineDeliveryPaginationLoading);
  }

  ionViewWillEnter() {
    this.loadUserDataAndReport();
    this.listenToSyncCompletion();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private loadUserDataAndReport() {
    // Get Tontine Session ID first (needed for members)
    this.subscriptions.add(
      this.store.select(TontineSelectors.selectTontineSession).subscribe(session => {
        this.tontineSessionId = session?.id || null;
        if (!this.tontineSessionId) {
          this.store.dispatch(TontineActions.loadTontineSession());
        }
      })
    );

    this.subscriptions.add(
      this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
        if (user) {
          this.commercialUsername = user.username;
          this.reportData.commercialName = user.username;

          const today = new Date();
          const dateString = today.toISOString().split('T')[0];
          const dateFilter = { startDate: dateString, endDate: dateString };

          // 1. Load KPIs for Summary Cards
          this.store.dispatch(KpiActions.loadAllKpi({
            commercialUsername: user.username,
            commercialId: user.username,
            dateFilter: dateFilter
          }));

          // 2. Load First Page for Active Tab (and default loaded tabs)
          this.loadTab(this.activeTab, true);

          // Initial load for default tabs if not active
          ['recouvrements', 'clients'].forEach(tab => {
            if (this.activeTab !== tab) this.loadTab(tab as any, true);
          });
        }
      })
    );

    // Subscribe to Data Lists to update reportData.items locally (for PDF and list display binding)
    this.subscriptions.add(this.distributions$.subscribe(items => { this.reportData.distributions.items = items; this.cdr.markForCheck(); }));
    this.subscriptions.add(this.recoveries$.subscribe(items => { this.reportData.recoveries.items = items; this.cdr.markForCheck(); }));
    this.subscriptions.add(this.clients$.subscribe(items => { this.reportData.newClients.items = items; this.cdr.markForCheck(); }));
    this.subscriptions.add(this.tontineMembers$.subscribe(items => {
      if (!this.reportData.tontineMembers) this.reportData.tontineMembers = { count: 0, items: [] };
      this.reportData.tontineMembers.items = items;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.tontineCollections$.subscribe(items => {
      if (!this.reportData.tontineCollections) this.reportData.tontineCollections = { count: 0, totalAmount: 0, items: [] };
      this.reportData.tontineCollections.items = items;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.tontineDeliveries$.subscribe(items => {
      if (!this.reportData.tontineDeliveries) this.reportData.tontineDeliveries = { count: 0, totalAmount: 0, items: [] };
      this.reportData.tontineDeliveries.items = items;
      this.cdr.markForCheck();
    }));


    // Subscribe to KPI updates / Pagination Counts
    this.subscriptions.add(this.store.select(DistributionSelectors.selectDistributionPaginationTotalItems).subscribe(count => {
      this.reportData.distributions.count = count;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.store.select(KpiSelectors.selectDistributionKpiDailyPayment).subscribe(amount => {
      this.reportData.distributions.totalAmount = amount;
      this.cdr.markForCheck();
    }));

    this.subscriptions.add(this.store.select(KpiSelectors.selectRecoveryKpiToday).subscribe(count => {
      this.reportData.recoveries.count = count;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.store.select(KpiSelectors.selectRecoveryKpiTodayAmount).subscribe(amount => {
      this.reportData.recoveries.totalAmount = amount;
      this.cdr.markForCheck();
    }));

    this.subscriptions.add(this.store.select(KpiSelectors.selectAccountActivityKpi).subscribe(kpi => {
      this.reportData.newClients.count = kpi.newClientsCount;
      this.reportData.newClients.totalBalance = kpi.newAccountsBalance;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.store.select(KpiSelectors.selectAdvancesKpi).subscribe(kpi => {
      this.reportData.advances.count = kpi.count;
      this.reportData.advances.totalAmount = kpi.totalAmount;
      this.updateTotalToPay();
      this.cdr.markForCheck();
    }));

    this.subscriptions.add(this.store.select(KpiSelectors.selectTontineKpi).subscribe(kpi => {
      this.reportData.tontine.count = kpi.dailyCollectionsCount + kpi.dailyDeliveriesCount;
      this.reportData.tontine.totalAmount = kpi.dailyCollectionsAmount;

      if (this.reportData.tontineMembers) this.reportData.tontineMembers.count = kpi.dailyMembersCount;
      else this.reportData.tontineMembers = { count: kpi.dailyMembersCount, items: [] };

      if (this.reportData.tontineCollections) this.reportData.tontineCollections.count = kpi.dailyCollectionsCount;
      else this.reportData.tontineCollections = { count: kpi.dailyCollectionsCount, totalAmount: kpi.dailyCollectionsAmount, items: [] };

      if (this.reportData.tontineDeliveries) this.reportData.tontineDeliveries.count = kpi.dailyDeliveriesCount;
      else this.reportData.tontineDeliveries = { count: kpi.dailyDeliveriesCount, totalAmount: kpi.dailyDeliveriesAmount, items: [] };

      this.updateTotalToPay();
      this.cdr.markForCheck();
    }));
  }

  private updateTotalToPay() {
    this.reportData.totalToPay =
      (this.reportData.recoveries?.totalAmount || 0) +
      (this.reportData.advances?.totalAmount || 0) +
      (this.reportData.tontine?.totalAmount || 0);
  }

  onSegmentChanged(event: any) {
    const newTab = event.detail.value;
    this.activeTab = newTab;
    this.loadTab(newTab);
  }

  private loadTab(tab: string, forceReset: boolean = false) {
    if (!this.commercialUsername) return;
    if (this.loadedTabs.has(tab) && !forceReset) return;

    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const dateFilter = { startDate: dateString, endDate: dateString };

    switch (tab) {
      case 'distributions':
        this.store.dispatch(DistributionActions.loadFirstPageDistributions({
          commercialUsername: this.commercialUsername,
          filters: { dateFilter }
        }));
        break;
      case 'recouvrements':
        this.store.dispatch(RecoveryActions.loadFirstPageRecoveries({
          commercialId: this.commercialUsername,
          filters: { dateFilter: dateFilter as any }
        }));
        break;
      case 'clients':
        this.store.dispatch(ClientActions.loadFirstPageClients({
          commercialUsername: this.commercialUsername,
          filters: { dateFilter: dateFilter as any }
        }));
        break;
      case 'tontine-membres':
        if (this.tontineSessionId) {
          this.store.dispatch(TontineActions.loadFirstPageTontineMembers({
            sessionId: this.tontineSessionId,
            filters: { dateFilter }
          }));
        }
        break;
      case 'tontine-collectes':
        this.store.dispatch(TontineActions.loadFirstPageTontineCollections({
          filters: { dateFilter }
        }));
        break;
      case 'tontine-livraisons':
        this.store.dispatch(TontineActions.loadFirstPageTontineDeliveries({
          filters: { dateFilter }
        }));
        break;
    }
    this.loadedTabs.add(tab);
  }

  // Infinite Scroll / Virtual Scroll Event
  onScrollIndexChange(index: number) {
    this.checkLoadMore(index);
  }
  private checkLoadMore(index: number) {
    const threshold = 5;

    switch (this.activeTab) {
      case 'distributions':
        this.store.select(DistributionSelectors.selectDistributionPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold) {
            this.store.dispatch(DistributionActions.loadNextPageDistributions({
              commercialUsername: this.commercialUsername!,
              filters: {
                dateFilter: {
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                }
              } as any
            }));
          }
        });
        break;
      case 'recouvrements':
        this.store.select(RecoverySelectors.selectRecoveryPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold) {
            this.store.dispatch(RecoveryActions.loadNextPageRecoveries({ commercialId: this.commercialUsername! }));
          }
        });
        break;
      case 'clients':
        this.store.select(ClientSelectors.selectClientPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold) {
            this.store.dispatch(ClientActions.loadNextPageClients({ commercialUsername: this.commercialUsername! }));
          }
        });
        break;
      case 'tontine-membres':
        this.store.select(TontineSelectors.selectTontineMemberPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold && this.tontineSessionId) {
            this.store.dispatch(TontineActions.loadNextPageTontineMembers({ sessionId: this.tontineSessionId }));
          }
        });
        break;
      case 'tontine-collectes':
        this.store.select(TontineSelectors.selectTontineCollectionPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold) {
            this.store.dispatch(TontineActions.loadNextPageTontineCollections({}));
          }
        });
        break;
      case 'tontine-livraisons':
        this.store.select(TontineSelectors.selectTontineDeliveryPagination).pipe(take(1)).subscribe(p => {
          if (p.hasMore && !p.loading && index > p.items.length - threshold) {
            this.store.dispatch(TontineActions.loadNextPageTontineDeliveries({}));
          }
        });
        break;
    }
  }

  loadMoreData(event: any) {
    if (!this.commercialUsername) {
      event.target.complete(); return;
    }
    const complete = () => event.target.complete();
    complete();
  }

  goBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  /**
   * Écoute la fin de la synchronisation pour générer automatiquement le PDF
   */
  private listenToSyncCompletion() {
    this.store.select(selectAutomaticSyncStatus).subscribe(status => {
      if (status === SyncStatus.COMPLETED) {
        // Générer automatiquement le PDF après synchronisation
        this.generatePDFAfterSync();
      }
    });
  }

  /**
   * Génère automatiquement le PDF après synchronisation
   */
  private async generatePDFAfterSync() {
    this.rapportJournalierService.getAllDailyReportData().subscribe(async (data) => {
      try {
        const htmlContent = this.rapportJournalierService.generatePDFHTML(data);
        const filename = this.pdfReportService.generateFilename();

        // Générer le PDF
        const pdfBase64 = await this.pdfReportService.generatePDF(htmlContent, filename);

        // Sauvegarder dans External Storage
        await this.pdfReportService.savePDFToExternalStorage(pdfBase64, filename);

        console.log('PDF généré automatiquement avec succès:', filename);

        // Afficher un toast discret
        const toast = await this.toastController.create({
          message: `Rapport PDF généré automatiquement`,
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      } catch (e) { console.error(e); }
    });
  }

  /**
   * Enregistre le rapport en PDF dans External Storage
   */
  async savePDF() {
    const loading = await this.loadingController.create({
      message: 'Enregistrement des données en cours...',
      backdropDismiss: false
    });
    await loading.present();

    try {
      const currentDate = new Date();

      this.rapportJournalierService.getDailyReportWithDetails(currentDate).subscribe({
        next: async (fullData) => {
          try {
            const htmlContent = this.rapportJournalierService.generatePDFHTML(fullData);
            const filename = this.pdfReportService.generateFilename();
            const pdfBase64 = await this.pdfReportService.generatePDF(htmlContent, filename);
            const uri = await this.pdfReportService.savePDFToExternalStorage(pdfBase64, filename);

            await loading.dismiss();

            const successToast = await this.toastController.create({
              message: `PDF sauvegardé : ${filename}`,
              duration: 3000,
              color: 'success',
              position: 'bottom',
              buttons: [{ text: 'OK', role: 'cancel' }]
            });
            await successToast.present();

            console.log('PDF sauvegardé avec succès:', uri);
          } catch (innerError) {
            console.error('Erreur interne lors de la génération PDF:', innerError);
            await loading.dismiss();
            this.showErrorToast('Erreur lors de la génération du contenu PDF');
          }
        },
        error: async (err) => {
          console.error('Erreur lors du chargement des détails pour PDF:', err);
          await loading.dismiss();
          this.showErrorToast('Impossible de charger les détails complets du rapport');
        }
      });

    } catch (error) {
      console.error('Erreur lors de la sauvegarde du PDF:', error);
      await loading.dismiss();
      this.showErrorToast('Erreur lors de la sauvegarde du PDF');
    }
  }

  private async showErrorToast(msg: string) {
    const errorToast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await errorToast.present();
  }

  async printReport() {
    // Afficher un loader car on va chercher les données complètes
    const loading = await this.loadingController.create({
      message: 'Préparation de l\'impression...',
      duration: 5000
    });
    await loading.present();

    const currentDate = new Date();

    // Charger les données complètes (lazy loaded inclus)
    this.rapportJournalierService.getDailyReportWithDetails(currentDate).subscribe({
      next: async (fullData) => {
        try {
          const htmlContent = this.rapportJournalierService.generateReportHTML(fullData);
          await loading.dismiss();

          // Utiliser le plugin Capacitor Printer
          await Printer.print({
            content: htmlContent,
            name: `rapport_journalier_${new Date().toISOString().split('T')[0]}`
          });

          console.log('Rapport imprimé avec succès');

          // Save the report to the database
          const commercial = await this.databaseService.getCommercial();
          if (commercial) {
            await this.databaseService.saveDailyReport(fullData, commercial.id);
          } else {
            console.error('Commercial not found, cannot save daily report.');
          }

        } catch (error) {
          await loading.dismiss();
          console.error('Erreur lors de l\'impression:', error);
          // En cas d'erreur d'impression, proposer de sauvegarder en PDF
          this.saveAsPDF(fullData); // Passer les données complètes si dispo
        }
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Erreur chargement données impression:', err);
        // Fallback sur les données partielles
        this.fallbackPrintOnly();
      }
    });
  }

  private async fallbackPrintOnly() {
    try {
      const htmlContent = this.rapportJournalierService.generateReportHTML(this.reportData);
      await Printer.print({
        content: htmlContent,
        name: `rapport_journalier_${new Date().toISOString().split('T')[0]}`
      });
    } catch (e) {
      console.error('Erreur fallback print:', e);
    }
  }

  private saveAsPDF(data?: any) {
    try {
      const reportToUse = data || this.reportData;
      const htmlContent = this.rapportJournalierService.generateReportHTML(reportToUse);
      const options = {
        margin: 1,
        filename: `rapport_journalier_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(htmlContent).set(options).save();

    } catch (error) {
      console.error('Erreur lors de la sauvegarde PDF:', error);
    }
  }

  private generateReportHTML(): string {
    return this.rapportJournalierService.generateReportHTML(this.reportData);
  }
  // Helper trackBy
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
