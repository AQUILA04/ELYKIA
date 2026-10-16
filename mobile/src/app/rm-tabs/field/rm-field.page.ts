import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { RmFieldListApiService } from '../../core/services/rm/rm-field-list-api.service';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCreditLate, RmPackTontineMember } from '../../core/services/rm/rm.models';
import { RmTontineFieldControlSheetComponent } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.component';
import { RmCarnetVerificationWriteService } from '../../core/services/rm/rm-carnet-verification-write.service';
import { RmCreditCarnetVerificationWriteService } from '../../core/services/rm/rm-credit-carnet-verification-write.service';
import { runConfirmedCarnetToggle } from '../../core/services/rm/rm-carnet-confirm.util';
import { countRmFieldItems, filterRmFieldGroups, RmFieldGroup } from './rm-field-search.util';

@Component({
  selector: 'app-rm-field',
  templateUrl: './rm-field.page.html',
  styleUrls: ['./rm-field.page.scss'],
  standalone: false,
})
export class RmFieldPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  /** Offline: filters the pack. Online: sent to the backend, which pages the full portfolio. */
  query = '';
  /** Online reads every client from the backend. Offline stays on the day-plan pack. */
  onlineMode = false;
  segment: 'tontine' | 'lates' = 'tontine';
  loadingLive = false;
  loadingMore = false;
  onlineTontine: RmPackTontineMember[] = [];
  onlineLates: RmCreditLate[] = [];
  private tontineMatchTotal = 0;
  private lateMatchTotal = 0;
  private tontineGrandTotal = 0;
  private lateGrandTotal = 0;
  private tontineNextPage = 0;
  private lateNextPage = 0;
  private lateGroups: RmFieldGroup<RmCreditLate>[] = [];
  private tontineGroups: RmFieldGroup<RmPackTontineMember>[] = [];
  private packSub?: Subscription;
  private viewActive = false;
  private liveRequest = 0;
  selectMode = false;
  selectedIds = new Set<number>();
  busy = false;

  get byCommercial(): RmFieldGroup<RmCreditLate>[] {
    return filterRmFieldGroups(this.lateGroups, this.query, item =>
      [item.clientName, item.clientPhone, item.clientQuarter, item.collector, item.reference]
        .filter((part): part is string => !!part)
        .join(' ')
    );
  }

  get tontineByCommercial(): RmFieldGroup<RmPackTontineMember>[] {
    return filterRmFieldGroups(this.tontineGroups, this.query, item =>
      [item.clientName, item.clientPhone, item.clientQuarter, item.tontineCollector]
        .filter((part): part is string => !!part)
        .join(' ')
    );
  }

  get tontineClientTotal(): number {
    return this.onlineMode ? this.tontineGrandTotal : countRmFieldItems(this.tontineGroups);
  }

  get lateClientTotal(): number {
    return this.onlineMode ? this.lateGrandTotal : countRmFieldItems(this.lateGroups);
  }

  get tontineClientVisible(): number {
    return this.onlineMode ? this.tontineMatchTotal : countRmFieldItems(this.tontineByCommercial);
  }

  get lateClientVisible(): number {
    return this.onlineMode ? this.lateMatchTotal : countRmFieldItems(this.byCommercial);
  }

  get activeHasMore(): boolean {
    if (!this.onlineMode) {
      return false;
    }
    if (this.segment === 'tontine') {
      return this.onlineTontine.length < this.tontineMatchTotal;
    }
    return this.onlineLates.length < this.lateMatchTotal;
  }

  clientCountLabel(visible: number, total: number): string {
    const noun = total > 1 ? 'clients' : 'client';
    if (this.query.trim() && visible !== total) {
      return `${visible} / ${total} ${noun}`;
    }
    return `${total} ${noun}`;
  }

  constructor(
    private readonly scope: RmScopeService,
    private readonly connectivity: ConnectivityService,
    private readonly fieldListApi: RmFieldListApiService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly carnetWrite: RmCarnetVerificationWriteService,
    private readonly creditCarnetWrite: RmCreditCarnetVerificationWriteService
  ) {}

  ngOnInit(): void {
    this.packSub = this.scope.pack$.subscribe(() => this.reloadFromPack());
  }

  ngOnDestroy(): void {
    this.liveRequest++;
    this.packSub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.viewActive = true;
    void this.refreshMode();
  }

  ionViewWillLeave(): void {
    this.viewActive = false;
    this.liveRequest++;
    this.loadingLive = false;
    this.loadingMore = false;
  }

  onSearchInput(): void {
    if (this.onlineMode) {
      void this.reloadOnlineLists();
    }
  }

  setSegment(segment: 'tontine' | 'lates'): void {
    this.segment = segment;
  }

  async loadMore(event: Event): Promise<void> {
    const target = event.target as HTMLIonInfiniteScrollElement | null;
    try {
      if (this.onlineMode && this.activeHasMore) {
        await this.appendOnlinePage(this.segment);
      }
    } finally {
      await target?.complete();
    }
  }

  private reloadFromPack(): void {
    this.loadLateCredits();
    this.loadTontineMembers();
  }

  private async refreshMode(): Promise<void> {
    const requestId = ++this.liveRequest;
    let reachable = false;
    try {
      reachable = await this.connectivity.checkBackendReachable();
    } catch {
      reachable = false;
    }
    if (!this.viewActive || requestId !== this.liveRequest) {
      return;
    }
    if (!reachable) {
      this.onlineMode = false;
      return;
    }
    this.onlineMode = true;
    await this.reloadOnlineLists();
  }

  private async reloadOnlineLists(): Promise<void> {
    const requestId = ++this.liveRequest;
    this.loadingLive = true;
    this.onlineTontine = [];
    this.onlineLates = [];
    this.tontineNextPage = 0;
    this.lateNextPage = 0;
    try {
      const search = this.query.trim();
      const [tontine, lates] = await Promise.all([
        this.fieldListApi.pageTontineMembers(search, 0),
        this.fieldListApi.pageLateCredits(search, 0)
      ]);
      if (!this.viewActive || requestId !== this.liveRequest) {
        return;
      }
      this.onlineTontine = tontine.content || [];
      this.onlineLates = lates.content || [];
      this.tontineMatchTotal = tontine.totalElements;
      this.lateMatchTotal = lates.totalElements;
      this.tontineNextPage = 1;
      this.lateNextPage = 1;
      if (!search) {
        this.tontineGrandTotal = tontine.totalElements;
        this.lateGrandTotal = lates.totalElements;
      }
    } catch {
      if (requestId === this.liveRequest) {
        this.onlineMode = false;
      }
    } finally {
      if (requestId === this.liveRequest) {
        this.loadingLive = false;
      }
    }
  }

  private async appendOnlinePage(segment: 'tontine' | 'lates'): Promise<void> {
    if (this.loadingMore || this.loadingLive) {
      return;
    }
    this.loadingMore = true;
    try {
      const search = this.query.trim();
      if (segment === 'tontine') {
        const page = await this.fieldListApi.pageTontineMembers(search, this.tontineNextPage);
        this.onlineTontine = this.onlineTontine.concat(page.content || []);
        this.tontineMatchTotal = page.totalElements;
        this.tontineNextPage += 1;
      } else {
        const page = await this.fieldListApi.pageLateCredits(search, this.lateNextPage);
        this.onlineLates = this.onlineLates.concat(page.content || []);
        this.lateMatchTotal = page.totalElements;
        this.lateNextPage += 1;
      }
    } catch {
      await this.toast('Impossible de charger la suite', 'danger');
    } finally {
      this.loadingMore = false;
    }
  }

  private loadLateCredits(): void {
    const lates = this.scope.getPack()?.lateCredits ?? [];
    const commercialMap = new Map<string, RmCreditLate[]>();
    for (const item of lates) {
      const c = item.collector || '—';
      if (!commercialMap.has(c)) {
        commercialMap.set(c, []);
      }
      commercialMap.get(c)!.push(item);
    }
    this.lateGroups = Array.from(commercialMap.entries()).map(([commercial, items]) => {
      const qMap = new Map<string, RmCreditLate[]>();
      for (const item of items) {
        const q = item.clientQuarter?.trim() || 'Non spécifié';
        if (!qMap.has(q)) {
          qMap.set(q, []);
        }
        qMap.get(q)!.push(item);
      }
      return {
        commercial,
        quarters: Array.from(qMap.entries()).map(([quarter, qItems]) => ({ quarter, items: qItems }))
      };
    });
  }

  private loadTontineMembers(): void {
    const members = this.scope.getPack()?.tontineMembers ?? [];
    const commercialMap = new Map<string, RmPackTontineMember[]>();
    for (const item of members) {
      const c = item.tontineCollector || '—';
      if (!commercialMap.has(c)) {
        commercialMap.set(c, []);
      }
      commercialMap.get(c)!.push(item);
    }
    this.tontineGroups = Array.from(commercialMap.entries()).map(([commercial, items]) => {
      const qMap = new Map<string, RmPackTontineMember[]>();
      for (const item of items) {
        const q = item.clientQuarter?.trim() || 'Non spécifié';
        if (!qMap.has(q)) {
          qMap.set(q, []);
        }
        qMap.get(q)!.push(item);
      }
      return {
        commercial,
        quarters: Array.from(qMap.entries()).map(([quarter, qItems]) => ({ quarter, items: qItems }))
      };
    });
  }

  openMaps(item: RmCreditLate): void {
    const client = this.scope.getPack()?.clients?.find(c => c.id === item.clientId);
    const mll = item.mll || client?.mll;
    const latitude = item.latitude ?? client?.latitude;
    const longitude = item.longitude ?? client?.longitude;
    const url = mll
      || (latitude != null && longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : null);
    if (url) {
      window.open(url, '_blank');
    }
  }

  async toggleCreditCarnet(item: RmCreditLate): Promise<void> {
    const next = !item.carnetVerified;
    await runConfirmedCarnetToggle({
      alertCtrl: this.alertCtrl,
      nextVerified: next,
      subjectLabel: item.clientName || item.reference || String(item.id),
      isBusy: () => this.busy,
      setBusy: busy => {
        this.busy = busy;
      },
      execute: () => this.creditCarnetWrite.setVerified(item, next).then(() => undefined),
      onSuccess: async verified => {
        item.carnetVerified = verified;
        this.loadLateCredits();
        await this.toast(verified ? 'Carnet vérifié' : 'Vérification annulée');
      },
      onError: message => this.toast(message, 'danger')
    });
  }

  async openTontineControl(member: RmPackTontineMember): Promise<void> {
    let detailed = member;
    const needsDetail = !(member.months || []).length
      || !(member.collectors || []).length;
    if (this.onlineMode && needsDetail) {
      try {
        detailed = await this.fieldListApi.getTontineMember(member.id);
      } catch {
        await this.toast('Impossible de charger le carnet', 'danger');
        return;
      }
    }
    const modal = await this.modalCtrl.create({
      component: RmTontineFieldControlSheetComponent,
      componentProps: { member: detailed },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.95
    });
    await modal.present();
    await modal.onDidDismiss();
    this.loadTontineMembers();
  }

  toggleSelectMode(): void {
    this.selectMode = !this.selectMode;
    if (!this.selectMode) {
      this.selectedIds = new Set();
    }
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: number): void {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  async toggleCarnet(member: RmPackTontineMember): Promise<void> {
    const next = !member.carnetVerified;
    await runConfirmedCarnetToggle({
      alertCtrl: this.alertCtrl,
      nextVerified: next,
      subjectLabel: member.clientName || String(member.id),
      isBusy: () => this.busy,
      setBusy: busy => {
        this.busy = busy;
      },
      execute: () => this.carnetWrite.setVerified(member, next).then(() => undefined),
      onSuccess: async verified => {
        member.carnetVerified = verified;
        this.loadTontineMembers();
        await this.toast(verified ? 'Carnet vérifié' : 'Vérification annulée');
      },
      onError: message => this.toast(message, 'danger')
    });
  }

  async verifySelection(): Promise<void> {
    const source = this.onlineMode ? this.onlineTontine : (this.scope.getPack()?.tontineMembers ?? []);
    const members = source.filter(m => this.selectedIds.has(m.id) && !m.carnetVerified);
    if (!members.length) {
      await this.toast('Aucun carnet non vérifié dans la sélection', 'warning');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Vérifier les carnets',
      message: `Marquer ${members.length} membre(s) comme vérifiés ?`,
      buttons: [
        { text: 'Non', role: 'cancel' },
        { text: 'Vérifier', role: 'confirm' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }
    this.busy = true;
    try {
      await this.carnetWrite.bulkSet(members, true);
      members.forEach(member => {
        member.carnetVerified = true;
      });
      this.selectedIds = new Set();
      this.selectMode = false;
      this.loadTontineMembers();
      await this.toast(`${members.length} carnet(s) vérifié(s)`);
    } catch (error: any) {
      await this.toast(error?.message || 'Échec de la vérification', 'danger');
    } finally {
      this.busy = false;
    }
  }

  controlStatus(member: RmPackTontineMember): string | null {
    const controls = this.scope.getPack()?.tontineFieldControlsToday ?? [];
    const found = controls.find(c => c.tontineMemberId === member.id);
    return found?.status ?? null;
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2200, color });
    await toast.present();
  }
}
