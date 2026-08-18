import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCreditLate, RmPackTontineMember } from '../../core/services/rm/rm.models';
import { RmTontineFieldControlSheetComponent } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.component';
import { RmCarnetVerificationWriteService } from '../../core/services/rm/rm-carnet-verification-write.service';

@Component({
  selector: 'app-rm-field',
  templateUrl: './rm-field.page.html',
  styleUrls: ['./rm-field.page.scss'],
  standalone: false,
})
export class RmFieldPage implements OnInit {
  byCommercial: { commercial: string; quarters: { quarter: string; items: RmCreditLate[] }[] }[] = [];
  tontineByCommercial: {
    commercial: string;
    quarters: { quarter: string; items: RmPackTontineMember[] }[];
  }[] = [];
  selectMode = false;
  selectedIds = new Set<number>();
  busy = false;

  constructor(
    private readonly scope: RmScopeService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly carnetWrite: RmCarnetVerificationWriteService
  ) {}

  ngOnInit(): void {
    this.loadLateCredits();
    this.loadTontineMembers();
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
    this.byCommercial = Array.from(commercialMap.entries()).map(([commercial, items]) => {
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
    this.tontineByCommercial = Array.from(commercialMap.entries()).map(([commercial, items]) => {
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
    const url = client?.mll
      || (client?.latitude != null && client?.longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${client.latitude},${client.longitude}`
        : null);
    if (url) {
      window.open(url, '_blank');
    }
  }

  async openTontineControl(member: RmPackTontineMember): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RmTontineFieldControlSheetComponent,
      componentProps: { member },
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
    if (this.busy) {
      return;
    }
    const next = !member.carnetVerified;
    const alert = await this.alertCtrl.create({
      header: next ? 'Vérifier le carnet' : 'Annuler la vérification',
      message: next
        ? `Marquer ${member.clientName} comme vérifié ?`
        : `Retirer la vérification de ${member.clientName} ?`,
      buttons: [
        { text: 'Non', role: 'cancel' },
        { text: next ? 'Vérifier' : 'Annuler', role: 'confirm' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }
    this.busy = true;
    try {
      await this.carnetWrite.setVerified(member, next);
      this.loadTontineMembers();
      await this.toast(next ? 'Carnet vérifié' : 'Vérification annulée');
    } catch (error: any) {
      await this.toast(error?.message || 'Échec de la vérification', 'danger');
    } finally {
      this.busy = false;
    }
  }

  async verifySelection(): Promise<void> {
    const members = (this.scope.getPack()?.tontineMembers ?? [])
      .filter(m => this.selectedIds.has(m.id) && !m.carnetVerified);
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
