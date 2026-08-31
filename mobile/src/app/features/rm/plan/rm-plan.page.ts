import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { RmFieldPlanApiService } from '../../../core/services/rm/rm-field-plan-api.service';
import { RmOfflinePackService } from '../../../core/services/rm/rm-offline-pack.service';
import { RmScopeService } from '../../../core/services/rm/rm-scope.service';
import { RmCollectorStat } from '../../../core/services/rm/rm.models';

@Component({
  selector: 'app-rm-plan',
  templateUrl: './rm-plan.page.html',
  styleUrls: ['./rm-plan.page.scss'],
  standalone: false,
})
export class RmPlanPage implements OnInit {
  step: 1 | 2 | 3 = 1;
  loadingStats = false;
  downloading = false;
  collectors: RmCollectorStat[] = [];
  selectedCommercials = new Set<string>();
  availableQuarters: string[] = [];
  selectedQuarters = new Set<string>();
  allQuarters = true;
  estimateLates = 0;
  estimateAmount = 0;
  readonly maxCommercials = 3;

  localityPickerOpen = false;
  localityQuery = '';
  private draftSelectedQuarters = new Set<string>();
  private draftAllQuarters = true;
  private localitySelectionCommitted = false;

  constructor(
    private readonly api: RmFieldPlanApiService,
    private readonly packService: RmOfflinePackService,
    private readonly scope: RmScopeService,
    private readonly router: Router,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController
  ) {}

  async ngOnInit(): Promise<void> {
    if (await this.scope.hasActivePlanWithPack()) {
      await this.router.navigateByUrl('/rm/dashboard', { replaceUrl: true });
      return;
    }
    try {
      const restored = await this.packService.restoreTodayPlanIfExists();
      if (restored) {
        await this.router.navigateByUrl('/rm/dashboard', { replaceUrl: true });
        return;
      }
    } catch {
      // Pas de plan serveur ou réseau indisponible : afficher l'assistant.
    }
    await this.loadCollectors();
  }

  get filteredQuarters(): string[] {
    const q = this.localityQuery.trim().toLowerCase();
    if (!q) {
      return this.availableQuarters;
    }
    return this.availableQuarters.filter(name => name.toLowerCase().includes(q));
  }

  get selectedQuarterPreview(): string[] {
    return Array.from(this.selectedQuarters).slice(0, 6);
  }

  get totalLateCount(): number {
    return this.collectors.reduce((sum, collector) => sum + (collector.lateCount || 0), 0);
  }

  get hasNoLateCredits(): boolean {
    return !this.loadingStats && this.collectors.length > 0 && this.totalLateCount === 0;
  }

  get isCollectorsEmpty(): boolean {
    return !this.loadingStats && this.collectors.length === 0;
  }

  async loadCollectors(): Promise<void> {
    this.loadingStats = true;
    try {
      this.collectors = await this.api.getCollectorStats();
    } catch (e: any) {
      await this.toast(`Impossible de charger les commerciaux : ${e?.message || e}`, 'danger');
    } finally {
      this.loadingStats = false;
    }
  }

  isSelected(username: string): boolean {
    return this.selectedCommercials.has(username);
  }

  toggleCommercial(username: string): void {
    if (this.selectedCommercials.has(username)) {
      this.selectedCommercials.delete(username);
    } else if (this.selectedCommercials.size >= this.maxCommercials) {
      void this.toast(`Maximum ${this.maxCommercials} commerciaux`, 'warning');
      return;
    } else {
      this.selectedCommercials.add(username);
    }
    this.rebuildQuarters();
  }

  private rebuildQuarters(): void {
    const quarters = new Set<string>();
    let lates = 0;
    let amount = 0;
    for (const c of this.collectors) {
      if (!this.selectedCommercials.has(c.username)) {
        continue;
      }
      lates += c.lateCount;
      amount += c.totalAmountRemaining || 0;
      (c.quarters || []).forEach(q => quarters.add(q));
    }
    this.availableQuarters = Array.from(quarters).sort((a, b) => a.localeCompare(b));
    this.estimateLates = lates;
    this.estimateAmount = amount;
    this.selectedQuarters = new Set();
    this.allQuarters = true;
  }

  openLocalityPicker(): void {
    this.localityQuery = '';
    this.draftSelectedQuarters = new Set(this.selectedQuarters);
    this.draftAllQuarters = this.allQuarters;
    this.localitySelectionCommitted = false;
    if (this.allQuarters) {
      this.selectedQuarters = new Set();
    }
    this.localityPickerOpen = true;
  }

  closeLocalityPicker(): void {
    if (!this.localitySelectionCommitted) {
      this.selectedQuarters = new Set(this.draftSelectedQuarters);
      this.allQuarters = this.draftAllQuarters;
    }
    this.localityPickerOpen = false;
    this.localityQuery = '';
  }

  applyLocalitySelection(): void {
    this.localitySelectionCommitted = true;
    this.allQuarters = this.selectedQuarters.size === 0;
    this.localityPickerOpen = false;
    this.localityQuery = '';
  }

  clearSelectedQuarters(): void {
    this.selectedQuarters = new Set();
  }

  toggleQuarter(quarter: string): void {
    if (this.selectedQuarters.has(quarter)) {
      this.selectedQuarters.delete(quarter);
    } else {
      this.selectedQuarters.add(quarter);
    }
    // Force change detection for Set mutations in template bindings
    this.selectedQuarters = new Set(this.selectedQuarters);
  }

  selectAllQuarters(): void {
    this.allQuarters = true;
    this.selectedQuarters = new Set();
  }

  goStep2(): void {
    if (this.selectedCommercials.size < 1) {
      void this.toast('Sélectionnez au moins un commercial', 'warning');
      return;
    }
    this.step = 2;
  }

  goStep3(): void {
    this.step = 3;
    this.recomputeEstimateWithQuarters();
  }

  private recomputeEstimateWithQuarters(): void {
    if (this.allQuarters || this.selectedQuarters.size === 0) {
      this.rebuildQuarters();
      return;
    }
    let lates = 0;
    let amount = 0;
    for (const c of this.collectors) {
      if (!this.selectedCommercials.has(c.username)) {
        continue;
      }
      const overlap = (c.quarters || []).some(q => this.selectedQuarters.has(q));
      if (overlap) {
        lates += c.lateCount;
        amount += c.totalAmountRemaining || 0;
      }
    }
    this.estimateLates = lates;
    this.estimateAmount = amount;
  }

  async confirmDownload(): Promise<void> {
    if (this.estimateLates > 400) {
      const alert = await this.alertCtrl.create({
        header: 'Volume élevé',
        message: `${this.estimateLates} retards estimés. Continuer le téléchargement ?`,
        buttons: [
          { text: 'Annuler', role: 'cancel' },
          { text: 'Continuer', role: 'confirm' }
        ]
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') {
        return;
      }
    }

    const loading = await this.loadingCtrl.create({
      message: 'Téléchargement du pack offline…',
      spinner: 'crescent'
    });
    await loading.present();
    this.downloading = true;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const quarters = this.allQuarters ? [] : Array.from(this.selectedQuarters);
      const result = await this.packService.createPlanAndDownload({
        planDate: today,
        commercialUsernames: Array.from(this.selectedCommercials),
        quarters
      });
      await loading.dismiss();
      if (result.volumeWarning && result.warningMessage) {
        await this.toast(result.warningMessage, 'warning');
      } else {
        const stats = result.pack.stats;
        const clientCount = stats?.clients ?? result.pack.clients?.length ?? 0;
        const tontineCount = stats?.tontineMembers ?? result.pack.tontineMembers?.length ?? 0;
        const lateCredits = stats?.lateCredits ?? result.pack.lateCredits?.length ?? 0;
        const message = lateCredits === 0
          ? `Pack prêt : aucun retard · ${clientCount} clients · ${tontineCount} membres tontine`
          : `Pack prêt : ${lateCredits} retards · ${clientCount} clients`;
        await this.toast(message, 'success');
      }
      await this.router.navigateByUrl('/rm/dashboard', { replaceUrl: true });
    } catch (e: any) {
      await loading.dismiss();
      await this.toast(e?.error?.message || e?.message || 'Échec du téléchargement', 'danger');
    } finally {
      this.downloading = false;
    }
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  formatLateCount(count: number): string {
    const value = count || 0;
    return value === 1 ? '1 retard' : `${value} retard${value > 1 ? 's' : ''}`;
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 3200, color, position: 'top' });
    await t.present();
  }
}
