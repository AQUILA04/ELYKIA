import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { RmFieldListApiService } from '../../core/services/rm/rm-field-list-api.service';
import { filterRmLateCredits } from './rm-dashboard-search.util';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCloseQueueService } from '../../core/services/rm/rm-close-queue.service';
import { RmMonthlyRecoveryRateService } from '../../core/services/rm/rm-monthly-recovery-rate.service';
import { RmCreditCarnetVerificationWriteService } from '../../core/services/rm/rm-credit-carnet-verification-write.service';
import { runConfirmedCarnetToggle } from '../../core/services/rm/rm-carnet-confirm.util';
import {
  RmCreditLate,
  RmOfflinePack,
  FieldDayPlan,
  MonthlyRecoveryRate
} from '../../core/services/rm/rm.models';
import { RmDossierSyncBadgeService } from '../../core/services/rm/rm-dossier-sync-badge.service';
import { RmCloseSheetComponent } from '../../features/rm/close/rm-close-sheet.component';
import { RmFieldControlSheetComponent } from '../../features/rm/field-control/rm-field-control-sheet.component';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-rm-dashboard',
  templateUrl: './rm-dashboard.page.html',
  styleUrls: ['./rm-dashboard.page.scss'],
  standalone: false,
})
export class RmDashboardPage implements OnInit, OnDestroy {
  plan: FieldDayPlan | null = null;
  pack: RmOfflinePack | null = null;
  grouped: { quarter: string; items: RmCreditLate[] }[] = [];
  filterCommercial = '';
  pendingCloses = 0;
  closedTodayAmount = 0;
  monthlyRate: MonthlyRecoveryRate | null = null;
  monthlyRateLoading = false;
  monthlyRateOffline = false;
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  carnetBusy = false;
  syncStamp = 0;
  query = '';
  /** Résultats serveur (en ligne, avec un terme saisi) ; null = on affiche le pack local. */
  serverResults: RmCreditLate[] | null = null;
  serverTotal = 0;
  searchLoading = false;
  loadingMore = false;
  private serverNextPage = 0;
  private searchRequest = 0;
  private controlByCredit = new Map<number, {
    status?: string;
    differenceAmount?: number;
    notebookTotalAmount?: number;
    note?: string;
    ecartDecisionStatus?: string | null;
    modifiable?: boolean;
  }>();
  private subs: Subscription[] = [];

  constructor(
    private readonly scope: RmScopeService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly monthlyRecovery: RmMonthlyRecoveryRateService,
    private readonly creditCarnetWrite: RmCreditCarnetVerificationWriteService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router,
    private readonly syncBadges: RmDossierSyncBadgeService,
    private readonly connectivity: ConnectivityService,
    private readonly fieldListApi: RmFieldListApiService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.scope.pack$.subscribe(pack => {
        this.pack = pack;
        this.plan = this.scope.getPlan();
        this.refreshControlIndex();
        this.rebuild();
      }),
      this.closeQueue.ops$.subscribe(ops => {
        this.pendingCloses = ops.filter(o => !o.isSync).length;
        this.closedTodayAmount = ops
          .filter(o => o.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))
          .reduce((s, o) => s + (o.amount || 0), 0);
      }),
      this.monthlyRecovery.rate$.subscribe(rate => {
        this.monthlyRate = rate;
      }),
      this.monthlyRecovery.loading$.subscribe(loading => {
        this.monthlyRateLoading = loading;
      }),
      this.monthlyRecovery.offline$.subscribe(offline => {
        this.monthlyRateOffline = offline;
      }),
      this.syncBadges.changes$.subscribe(() => {
        this.syncStamp++;
      })
    );
    void this.refreshMonthlyRate();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get lateCount(): number {
    return this.filteredLates().length;
  }

  get totalDue(): number {
    return this.filteredLates().reduce((s, c) => s + (c.totalAmountRemaining || 0), 0);
  }

  get monthLabel(): string {
    const label = new Date(this.selectedYear, this.selectedMonth - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  setCommercialFilter(username: string): void {
    this.filterCommercial = username;
    this.rebuild();
  }

  get searching(): boolean {
    return !!this.query.trim();
  }

  get hasMoreServer(): boolean {
    return !!this.serverResults && this.serverNextPage * PAGE_SIZE < this.serverTotal;
  }

  onSearchInput(): void {
    void this.runSearch();
  }

  async loadMore(event: Event): Promise<void> {
    const target = event.target as HTMLIonInfiniteScrollElement | null;
    try {
      if (!this.hasMoreServer || this.loadingMore || this.searchLoading) {
        return;
      }
      this.loadingMore = true;
      const requestId = this.searchRequest;
      const page = await this.fieldListApi.pageLateCredits(this.query.trim(), this.serverNextPage);
      if (requestId !== this.searchRequest) {
        return;
      }
      this.serverResults = (this.serverResults ?? []).concat(page.content || []);
      this.serverTotal = page.totalElements;
      this.serverNextPage += 1;
      this.rebuild();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Impossible de charger la suite',
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loadingMore = false;
      await target?.complete();
    }
  }

  shiftMonth(delta: number): void {
    const d = new Date(this.selectedYear, this.selectedMonth - 1 + delta, 1);
    this.selectedYear = d.getFullYear();
    this.selectedMonth = d.getMonth() + 1;
    void this.refreshMonthlyRate();
  }

  openPlan(): void {
    void this.router.navigate(['/rm/plan'], { queryParams: { change: '1' } });
  }

  controlStatus(creditId: number): string | null {
    return this.controlByCredit.get(creditId)?.status || null;
  }

  controlMeta(creditId: number) {
    return this.controlByCredit.get(creditId) || null;
  }

  async openClose(item: RmCreditLate, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: RmCloseSheetComponent,
      componentProps: { credit: item },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  async openFieldControl(item: RmCreditLate, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: RmFieldControlSheetComponent,
      componentProps: { credit: item, previous: this.controlMeta(item.id) },
      cssClass: 'rm-close-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  async toggleCreditCarnet(item: RmCreditLate, event?: Event): Promise<void> {
    event?.stopPropagation();
    const next = !item.carnetVerified;
    await runConfirmedCarnetToggle({
      alertCtrl: this.alertCtrl,
      nextVerified: next,
      subjectLabel: item.clientName || item.reference || String(item.id),
      isBusy: () => this.carnetBusy,
      setBusy: busy => {
        this.carnetBusy = busy;
      },
      execute: () => this.creditCarnetWrite.setVerified(item, next).then(() => undefined),
      onSuccess: async verified => {
        const toast = await this.toastCtrl.create({
          message: verified ? 'Carnet vérifié' : 'Vérification annulée',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      onError: async message => {
        const toast = await this.toastCtrl.create({
          message,
          duration: 2500,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  isCreditLocal(item: RmCreditLate): boolean {
    return this.syncStamp >= 0 && this.syncBadges.isCreditLocal(item.id, item.clientId);
  }

  creditSyncErrorId(item: RmCreditLate): string | null {
    return this.syncStamp >= 0 ? this.syncBadges.creditSyncErrorId(item.id, item.clientId) : null;
  }

  openSyncError(event: Event, errorId: string): void {
    event.stopPropagation();
    event.preventDefault();
    void this.router.navigate(['/sync-errors', errorId]);
  }

  formatRate(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 })} %`;
  }

  private async refreshMonthlyRate(): Promise<void> {
    await this.monthlyRecovery.load(this.selectedYear, this.selectedMonth);
  }

  private async runSearch(): Promise<void> {
    const requestId = ++this.searchRequest;
    const term = this.query.trim();
    this.serverResults = null;
    this.serverTotal = 0;
    this.serverNextPage = 0;
    // Filtre local immédiat ; le serveur le remplace s'il répond.
    this.rebuild();
    if (!term) {
      this.searchLoading = false;
      return;
    }
    this.searchLoading = true;
    try {
      const reachable = await this.connectivity.checkBackendReachable().catch(() => false);
      if (!reachable || requestId !== this.searchRequest) {
        return;
      }
      const page = await this.fieldListApi.pageLateCredits(term, 0);
      if (requestId !== this.searchRequest) {
        return;
      }
      this.serverResults = page.content || [];
      this.serverTotal = page.totalElements;
      this.serverNextPage = 1;
    } catch {
      this.serverResults = null;
    } finally {
      if (requestId === this.searchRequest) {
        this.searchLoading = false;
        this.rebuild();
      }
    }
  }

  private filteredLates(): RmCreditLate[] {
    let items: RmCreditLate[];
    if (this.serverResults) {
      // Le serveur ignore le plan du jour : on ne garde que les commerciaux du plan.
      const scope = this.plan?.commercialUsernames;
      items = scope?.length
        ? this.serverResults.filter(i => scope.includes(i.collector ?? ''))
        : this.serverResults;
    } else {
      items = filterRmLateCredits(this.pack?.lateCredits ?? [], this.query);
    }
    if (!this.filterCommercial) {
      return items;
    }
    return items.filter(i => i.collector === this.filterCommercial);
  }

  private refreshControlIndex(): void {
    this.controlByCredit.clear();
    const controls = this.pack?.creditFieldControlsToday;
    if (!Array.isArray(controls)) {
      return;
    }
    for (const c of controls as any[]) {
      if (c?.creditId != null && c?.status) {
        this.controlByCredit.set(Number(c.creditId), {
          status: String(c.status),
          differenceAmount: c.differenceAmount,
          notebookTotalAmount: c.notebookTotalAmount,
          note: c.note,
          ecartDecisionStatus: c.ecartDecisionStatus,
          modifiable: c.modifiable
        });
      }
    }
  }

  private rebuild(): void {
    const map = new Map<string, RmCreditLate[]>();
    for (const item of this.filteredLates()) {
      const q = item.clientQuarter?.trim() || 'Non spécifié';
      if (!map.has(q)) {
        map.set(q, []);
      }
      map.get(q)!.push(item);
    }
    this.grouped = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([quarter, items]) => ({ quarter, items }));
  }
}
