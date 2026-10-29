import { Component, OnDestroy, OnInit } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { AlertController, ModalController, ToastController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { debounceTime, skip } from 'rxjs/operators';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { RmFieldListApiService } from '../../core/services/rm/rm-field-list-api.service';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCreditLate, RmPackTontineFieldControlToday, RmPackTontineMember } from '../../core/services/rm/rm.models';
import { RmTontineFieldControlApiService } from '../../core/services/rm/rm-tontine-field-control-api.service';
import { RmTontineFieldControlDto } from '../../core/services/rm/rm-tontine-field-control.models';
import { RmFieldControlSheetComponent, RmPreviousFieldControl } from '../../features/rm/field-control/rm-field-control-sheet.component';
import { RmTontineFieldControlSheetComponent } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.component';
import { describeFailure, TontineControlDebug } from '../../features/rm/tontine-field-control/rm-tontine-control-debug';
import { RmCarnetVerificationWriteService } from '../../core/services/rm/rm-carnet-verification-write.service';
import { RmCreditCarnetVerificationWriteService } from '../../core/services/rm/rm-credit-carnet-verification-write.service';
import { RmDossierSyncBadgeService } from '../../core/services/rm/rm-dossier-sync-badge.service';
import { runConfirmedCarnetToggle } from '../../core/services/rm/rm-carnet-confirm.util';
import { countRmFieldItems, filterRmFieldGroups, RmFieldGroup } from './rm-field-search.util';
import {
  filterRmFieldGroupsByProgress,
  matchesRmFieldProgress,
  RmFieldControlSnapshot,
  RmFieldProgressFilter,
  toRmFieldListProgress
} from './rm-field-progress.util';

@Component({
  selector: 'app-rm-field',
  templateUrl: './rm-field.page.html',
  styleUrls: ['./rm-field.page.scss'],
  standalone: false,
})
export class RmFieldPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  /** Offline: filters the pack. Online: sent to the backend, which pages the full portfolio. */
  query = '';
  /** Tous / À faire / Déjà fait. À faire = jamais contrôlé. Déjà fait = contrôlé, quelle que soit la date. */
  progressFilter: RmFieldProgressFilter = 'all';
  /** Online reads every client from the backend. Offline stays on the day-plan pack. */
  onlineMode = false;
  segment: 'tontine' | 'credits' = 'tontine';
  loadingLive = false;
  loadingMore = false;
  onlineTontine: RmPackTontineMember[] = [];
  onlineCredits: RmCreditLate[] = [];
  private tontineMatchTotal = 0;
  private creditMatchTotal = 0;
  private tontineGrandTotal = 0;
  private creditGrandTotal = 0;
  private tontineNextPage = 0;
  private creditNextPage = 0;
  private creditGroups: RmFieldGroup<RmCreditLate>[] = [];
  private tontineGroups: RmFieldGroup<RmPackTontineMember>[] = [];
  /** Groupes pré-filtrés mis à jour explicitement — évite le recalcul à chaque cycle CD. */
  filteredTontineGroups: RmFieldGroup<RmPackTontineMember>[] = [];
  filteredCreditGroups: RmFieldGroup<RmCreditLate>[] = [];
  private packSub?: Subscription;
  private syncSub?: Subscription;
  /** Force le rafraîchissement des pastilles Sync / Local. */
  syncStamp = 0;
  private viewActive = false;
  private liveRequest = 0;
  selectMode = false;
  selectedIds = new Set<number>();
  busy = false;
  /** Vrai tant que le clavier de la recherche est ouvert ou en train de se fermer. */
  private keyboardSettling = false;
  private keyboardSettleTimer?: ReturnType<typeof setTimeout>;

  get byCommercial(): RmFieldGroup<RmCreditLate>[] {
    return this.filteredCreditGroups;
  }

  get tontineByCommercial(): RmFieldGroup<RmPackTontineMember>[] {
    return this.filteredTontineGroups;
  }

  get tontineClientTotal(): number {
    return this.onlineMode ? this.tontineGrandTotal : countRmFieldItems(this.tontineGroups);
  }

  get creditClientTotal(): number {
    return this.onlineMode ? this.creditGrandTotal : countRmFieldItems(this.creditGroups);
  }

  get tontineClientVisible(): number {
    return this.onlineMode ? this.tontineMatchTotal : countRmFieldItems(this.tontineByCommercial);
  }

  get creditClientVisible(): number {
    return this.onlineMode ? this.creditMatchTotal : countRmFieldItems(this.byCommercial);
  }

  get activeHasMore(): boolean {
    if (!this.onlineMode) {
      return false;
    }
    if (this.segment === 'tontine') {
      return this.onlineTontine.length < this.tontineMatchTotal;
    }
    return this.onlineCredits.length < this.creditMatchTotal;
  }

  clientCountLabel(visible: number, total: number): string {
    const narrowed = !!this.query.trim() || this.progressFilter !== 'all';
    if (narrowed && total > 0 && visible !== total) {
      const noun = total > 1 ? 'clients' : 'client';
      return `${visible} / ${total} ${noun}`;
    }
    const shown = narrowed ? visible : total;
    const noun = shown > 1 ? 'clients' : 'client';
    return `${shown} ${noun}`;
  }

  emptyListLabel(kind: 'pack' | 'tontine' | 'credits'): string {
    if (this.query.trim()) {
      return 'Aucun résultat pour cette recherche.';
    }
    if (this.progressFilter === 'todo') {
      return 'Aucun dossier encore à contrôler.';
    }
    if (this.progressFilter === 'done') {
      return 'Aucun contrôle déjà fait.';
    }
    if (kind === 'tontine') {
      return 'Aucun membre tontine.';
    }
    if (kind === 'credits') {
      return 'Aucun crédit en cours.';
    }
    return 'Aucun crédit en cours ni membre tontine dans le pack.';
  }

  constructor(
    private readonly scope: RmScopeService,
    private readonly connectivity: ConnectivityService,
    private readonly fieldListApi: RmFieldListApiService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly carnetWrite: RmCarnetVerificationWriteService,
    private readonly creditCarnetWrite: RmCreditCarnetVerificationWriteService,
    private readonly tontineControlApi: RmTontineFieldControlApiService,
    private readonly syncBadges: RmDossierSyncBadgeService
  ) {}

  ngOnInit(): void {
    // skip(1) : ignore l'émission initiale du BehaviorSubject (traitée dans ionViewWillEnter).
    // debounceTime(100) : absorbe les appels setPack() en rafale (vérification carnet multiple, etc.).
    this.packSub = this.scope.pack$
      .pipe(skip(1), debounceTime(100))
      .subscribe(() => this.reloadFromPack());
    this.syncSub = this.syncBadges.changes$.subscribe(() => {
      this.syncStamp++;
    });
  }

  ngOnDestroy(): void {
    this.liveRequest++;
    this.packSub?.unsubscribe();
    this.syncSub?.unsubscribe();
    this.clearKeyboardTimer();
  }

  onSearchFocus(): void {
    this.keyboardSettling = true;
    this.clearKeyboardTimer();
  }

  onSearchBlur(): void {
    this.keyboardSettling = true;
    this.clearKeyboardTimer();
    this.keyboardSettleTimer = setTimeout(() => {
      this.keyboardSettling = false;
      this.keyboardSettleTimer = undefined;
    }, 600);
  }

  ionViewWillEnter(): void {
    this.viewActive = true;
    // Différer le chargement pour laisser la vue s'afficher avant de reconstruire les groupes.
    requestAnimationFrame(() => {
      this.reloadFromPack();
      void this.refreshMode();
    });
  }

  ionViewWillLeave(): void {
    this.viewActive = false;
    this.liveRequest++;
    this.loadingLive = false;
    this.loadingMore = false;
  }

  onSearchInput(): void {
    this.updateFilteredGroups();
    if (this.onlineMode) {
      void this.reloadOnlineLists();
    }
  }

  setSegment(segment: 'tontine' | 'credits'): void {
    this.segment = segment;
  }

  setProgress(filter: RmFieldProgressFilter): void {
    if (this.progressFilter === filter) {
      return;
    }
    this.progressFilter = filter;
    this.updateFilteredGroups();
    if (this.onlineMode) {
      void this.reloadOnlineLists();
    }
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
    TontineControlDebug.note('field reloadFromPack');
    this.loadInProgressCredits();
    this.loadTontineMembers();
    this.updateFilteredGroups();
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
      TontineControlDebug.note('field refreshMode offline');
      return;
    }
    this.onlineMode = true;
    TontineControlDebug.note('field refreshMode online');
    await this.reloadOnlineLists();
  }

  private async reloadOnlineLists(): Promise<void> {
    const requestId = ++this.liveRequest;
    TontineControlDebug.note(`field reloadOnlineLists start q="${this.query.trim()}"`);
    this.loadingLive = true;
    this.onlineTontine = [];
    this.onlineCredits = [];
    this.tontineNextPage = 0;
    this.creditNextPage = 0;
    try {
      const search = this.query.trim();
      const progress = toRmFieldListProgress(this.progressFilter);
      const [tontine, credits] = await Promise.all([
        this.fieldListApi.pageTontineMembers(search, 0, progress),
        this.fieldListApi.pageCredits(search, 0, progress)
      ]);
      if (!this.viewActive || requestId !== this.liveRequest) {
        TontineControlDebug.note('field reloadOnlineLists ignored');
        return;
      }
      TontineControlDebug.note(
        `field reloadOnlineLists ok tontine=${tontine.content?.length ?? 0} credits=${credits.content?.length ?? 0}`
      );
      this.onlineTontine = tontine.content || [];
      this.onlineCredits = credits.content || [];
      this.tontineMatchTotal = tontine.totalElements;
      this.creditMatchTotal = credits.totalElements;
      this.tontineNextPage = 1;
      this.creditNextPage = 1;
      if (!search && this.progressFilter === 'all') {
        this.tontineGrandTotal = tontine.totalElements;
        this.creditGrandTotal = credits.totalElements;
      }
    } catch (error) {
      TontineControlDebug.note(`field reloadOnlineLists error ${describeFailure(error)}`);
      if (requestId === this.liveRequest) {
        this.onlineMode = false;
      }
    } finally {
      if (requestId === this.liveRequest) {
        this.loadingLive = false;
      }
    }
  }

  private async appendOnlinePage(segment: 'tontine' | 'credits'): Promise<void> {
    if (this.loadingMore || this.loadingLive) {
      return;
    }
    this.loadingMore = true;
    try {
      const search = this.query.trim();
      const progress = toRmFieldListProgress(this.progressFilter);
      if (segment === 'tontine') {
        const page = await this.fieldListApi.pageTontineMembers(search, this.tontineNextPage, progress);
        this.onlineTontine = this.onlineTontine.concat(page.content || []);
        this.tontineMatchTotal = page.totalElements;
        this.tontineNextPage += 1;
      } else {
        const page = await this.fieldListApi.pageCredits(search, this.creditNextPage, progress);
        this.onlineCredits = this.onlineCredits.concat(page.content || []);
        this.creditMatchTotal = page.totalElements;
        this.creditNextPage += 1;
      }
    } catch {
      await this.toast('Impossible de charger la suite', 'danger');
    } finally {
      this.loadingMore = false;
    }
  }

  private loadInProgressCredits(): void {
    const pack = this.scope.getPack();
    const credits = pack?.inProgressCredits !== undefined
      ? (pack.inProgressCredits ?? [])
      : (pack?.lateCredits ?? []);
    const commercialMap = new Map<string, RmCreditLate[]>();
    for (const item of credits) {
      const c = item.collector || '—';
      if (!commercialMap.has(c)) {
        commercialMap.set(c, []);
      }
      commercialMap.get(c)!.push(item);
    }
    this.creditGroups = Array.from(commercialMap.entries()).map(([commercial, items]) => {
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
    this.updateFilteredGroups();
  }

  private updateFilteredGroups(): void {
    const tontine = filterRmFieldGroups(this.tontineGroups, this.query, item =>
      [item.clientName, item.clientPhone, item.clientQuarter, item.tontineCollector]
        .filter((part): part is string => !!part)
        .join(' ')
    );
    const credits = filterRmFieldGroups(this.creditGroups, this.query, item =>
      [item.clientName, item.clientPhone, item.clientQuarter, item.collector, item.reference]
        .filter((part): part is string => !!part)
        .join(' ')
    );
    this.filteredTontineGroups = filterRmFieldGroupsByProgress(
      tontine,
      this.progressFilter,
      item => this.packTontineSnapshot(item)
    );
    this.filteredCreditGroups = filterRmFieldGroupsByProgress(
      credits,
      this.progressFilter,
      item => this.packCreditSnapshot(item)
    );
  }

  private packCreditSnapshot(item: RmCreditLate): RmFieldControlSnapshot {
    const controls = this.scope.getPack()?.creditFieldControlsToday;
    if (!Array.isArray(controls)) {
      return {};
    }
    const found = (controls as Array<RmFieldControlSnapshot & { creditId?: number }>).find(
      control => Number(control?.creditId) === item.id
    );
    if (!found?.status && !found?.observedAt) {
      return {};
    }
    return found ?? {};
  }

  private packTontineSnapshot(member: RmPackTontineMember): RmFieldControlSnapshot {
    const found = (this.scope.getPack()?.tontineFieldControlsToday ?? [])
      .find(control => control.tontineMemberId === member.id);
    if (!found?.status && !found?.observedAt) {
      return {};
    }
    return {
      observedAt: found?.observedAt,
      status: found?.status,
      ecartDecisionStatus: found?.ecartDecisionStatus,
      modifiable: found?.modifiable
    };
  }

  private reconcileOnlineRow(kind: 'tontine' | 'credits', id: number, snapshot: RmFieldControlSnapshot): void {
    if (!this.onlineMode || matchesRmFieldProgress(this.progressFilter, snapshot)) {
      return;
    }
    if (kind === 'tontine') {
      const next = this.onlineTontine.filter(member => member.id !== id);
      if (next.length !== this.onlineTontine.length) {
        this.onlineTontine = next;
        this.tontineMatchTotal = Math.max(0, this.tontineMatchTotal - 1);
      }
      return;
    }
    const next = this.onlineCredits.filter(credit => credit.id !== id);
    if (next.length !== this.onlineCredits.length) {
      this.onlineCredits = next;
      this.creditMatchTotal = Math.max(0, this.creditMatchTotal - 1);
    }
  }

  isLate(item: RmCreditLate): boolean {
    return !!item.lateType || (item.lateDaysDelai ?? 0) > 0;
  }

  creditControlFor(item: RmCreditLate): RmPreviousFieldControl | null {
    if (this.onlineMode) {
      if (!item.latestControlStatus) {
        return null;
      }
      return {
        status: item.latestControlStatus,
        differenceAmount: item.latestDifferenceAmount,
        notebookTotalAmount: item.latestNotebookTotalAmount,
        note: item.latestControlNote,
        ecartDecisionStatus: item.ecartDecisionStatus,
        modifiable: item.modifiable
      };
    }
    const controls = this.scope.getPack()?.creditFieldControlsToday;
    if (!Array.isArray(controls)) {
      return null;
    }
    const found = (controls as RmPreviousFieldControl[]).find(
      (control: RmPreviousFieldControl & { creditId?: number }) => Number(control?.creditId) === item.id
    );
    if (!found?.status) {
      return null;
    }
    return found;
  }

  async openFieldControl(item: RmCreditLate): Promise<void> {
    if (this.keyboardSettling) {
      await this.hideSearchKeyboard();
    }
    const previous = this.creditControlFor(item);
    const modal = await this.modalCtrl.create({
      component: RmFieldControlSheetComponent,
      componentProps: { credit: item, previous },
      cssClass: 'rm-close-modal',
      backdropDismiss: false,
      keyboardClose: true
    });
    await modal.present();
    const dismissed = await modal.onDidDismiss();
    const op = (dismissed.data as { op?: {
      status?: string;
      differenceAmount?: number;
      notebookTotalAmount?: number;
      note?: string;
      observedAt?: string;
    } } | undefined)?.op;
    if (dismissed.role === 'confirm' && op) {
      item.latestControlStatus = op.status;
      item.latestDifferenceAmount = op.differenceAmount;
      item.latestNotebookTotalAmount = op.notebookTotalAmount;
      item.latestControlNote = op.note;
      item.latestObservedAt = op.observedAt;
      item.ecartDecisionStatus = op.status === 'ECART' ? 'PENDING' : null;
      item.modifiable = op.status === 'ECART';
      this.reconcileOnlineRow('credits', item.id, {
        observedAt: item.latestObservedAt,
        status: item.latestControlStatus,
        ecartDecisionStatus: item.ecartDecisionStatus,
        modifiable: item.modifiable
      });
      this.loadInProgressCredits();
      this.updateFilteredGroups();
    }
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
        this.loadInProgressCredits();
        this.updateFilteredGroups();
        await this.toast(verified ? 'Carnet vérifié' : 'Vérification annulée');
      },
      onError: message => this.toast(message, 'danger')
    });
  }

  async openTontineControl(member: RmPackTontineMember): Promise<void> {
    const waitForKeyboard = this.keyboardSettling;
    TontineControlDebug.note(`open member=${member.id} online=${this.onlineMode} keyboard=${waitForKeyboard}`);

    // FIX : attendre la fin complète de l'animation clavier EN PREMIER,
    // AVANT de charger le détail et d'ouvrir le modal.
    // La race condition clavier ↔ modal est la cause du gel sur Android.
    if (waitForKeyboard) {
      await this.hideSearchKeyboard();
    }

    let detailed = member;
    const needsDetail = !(member.months || []).length
      || !(member.collectors || []).length;
    if (this.onlineMode && needsDetail) {
      try {
        detailed = await this.fieldListApi.getTontineMember(member.id);
      } catch (error) {
        TontineControlDebug.note(`detail error ${describeFailure(error)}`);
        await this.toast('Impossible de charger le carnet', 'danger');
        return;
      }
    }

    TontineControlDebug.note(
      `detail months=${detailed.months?.length ?? 0} collectors=${detailed.collectors?.length ?? 0}`
    );
    const known = this.controlFor(member);
    let latestControl = known;
    const modifying = this.isModifiable(known);
    if (this.onlineMode && modifying) {
      try {
        latestControl = this.toControlSummary(await this.tontineControlApi.getLatest(member.id));
      } catch (error) {
        TontineControlDebug.note(`latest control error ${describeFailure(error)}`);
      }
    }

    const modal = await this.modalCtrl.create({
      component: RmTontineFieldControlSheetComponent,
      componentProps: { member: detailed, modifying, latestControl },
      cssClass: 'rm-tontine-control-modal',
      backdropDismiss: false,
      keyboardClose: true
    });
    await modal.present();
    TontineControlDebug.note('modal presented');
    const dismissed = await modal.onDidDismiss();
    TontineControlDebug.note(`modal dismissed role=${dismissed.role || '-'}`);
    const op = (dismissed.data as {
      op?: {
        status?: string;
        differenceAmount?: number;
        observedAt?: string;
        carnetVerified?: boolean;
        carnetVerifiedAt?: string;
        carnetVerifiedBy?: string;
      };
    } | undefined)?.op;
    if (dismissed.role === 'confirm' && op) {
      member.latestControlStatus = op.status;
      member.latestDifferenceAmount = op.differenceAmount;
      member.latestObservedAt = op.observedAt;
      member.ecartDecisionStatus = op.status === 'ECART' ? 'PENDING' : null;
      member.modifiable = op.status === 'ECART';
      if (op.carnetVerified) {
        member.carnetVerified = true;
        if (op.carnetVerifiedAt) {
          member.carnetVerifiedAt = op.carnetVerifiedAt;
        }
        if (op.carnetVerifiedBy) {
          member.carnetVerifiedBy = op.carnetVerifiedBy;
        }
      }
      this.reconcileOnlineRow('tontine', member.id, {
        observedAt: member.latestObservedAt,
        status: member.latestControlStatus,
        ecartDecisionStatus: member.ecartDecisionStatus,
        modifiable: member.modifiable
      });
    }
    this.loadTontineMembers();
  }

  /**
   * Le tap sur Contrôle retire déjà le focus. On attend la fin de l'animation
   * du clavier : l'ouvrir en même temps que la fiche bloque le fil Android.
   */
  private async hideSearchKeyboard(): Promise<void> {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    this.keyboardSettling = false;
    this.clearKeyboardTimer();
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    let handlePromise: Promise<PluginListenerHandle> | undefined;
    try {
      await new Promise<void>(resolve => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          resolve();
        };
        const timer = window.setTimeout(done, 600);
        handlePromise = Keyboard.addListener('keyboardDidHide', done);
        void Keyboard.hide().catch(() => undefined);
      });
    } finally {
      const handle = await handlePromise?.catch(() => undefined);
      await handle?.remove();
    }
  }

  private clearKeyboardTimer(): void {
    if (this.keyboardSettleTimer) {
      clearTimeout(this.keyboardSettleTimer);
      this.keyboardSettleTimer = undefined;
    }
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

  controlFor(member: RmPackTontineMember): RmPackTontineFieldControlToday | null {
    if (this.onlineMode) {
      if (!member.latestControlStatus) {
        return null;
      }
      return {
        tontineMemberId: member.id,
        status: member.latestControlStatus,
        differenceAmount: member.latestDifferenceAmount,
        observedAt: member.latestObservedAt,
        ecartDecisionStatus: member.ecartDecisionStatus,
        modifiable: member.modifiable
      };
    }
    const controls = this.scope.getPack()?.tontineFieldControlsToday ?? [];
    return controls.find(c => c.tontineMemberId === member.id) ?? null;
  }

  private toControlSummary(dto: RmTontineFieldControlDto): RmPackTontineFieldControlToday {
    return {
      tontineMemberId: dto.tontineMemberId,
      reference: dto.reference,
      status: dto.status,
      notebookTotalAmount: dto.notebookTotalAmount,
      systemTotalAmount: dto.systemTotalAmount,
      differenceAmount: dto.differenceAmount,
      note: dto.note,
      observedAt: dto.observedAt,
      ecartDecisionStatus: dto.ecartDecisionStatus,
      modifiable: dto.modifiable,
      lines: dto.lines,
      collectors: dto.collectors
    };
  }

  isModifiable(control: RmPackTontineFieldControlToday | null): boolean {
    if (!control) {
      return false;
    }
    if (typeof control.modifiable === 'boolean') {
      return control.modifiable;
    }
    if (control.status !== 'ECART') {
      return false;
    }
    return !control.ecartDecisionStatus || control.ecartDecisionStatus === 'PENDING';
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  isCreditLocal(item: RmCreditLate): boolean {
    return this.syncStamp >= 0 && this.syncBadges.isCreditLocal(item.id, item.clientId);
  }

  isTontineLocal(item: RmPackTontineMember): boolean {
    return this.syncStamp >= 0 && this.syncBadges.isTontineLocal(item.id, item.clientId);
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2200, color });
    await toast.present();
  }
}



