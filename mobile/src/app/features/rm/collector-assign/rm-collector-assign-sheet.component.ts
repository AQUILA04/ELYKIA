import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RmPackClient } from '../../../core/services/rm/rm.models';
import { RmCollectorOption } from '../../../core/services/rm/rm-collector-assign.models';
import { RmCollectorAssignWriteService } from '../../../core/services/rm/rm-collector-assign-write.service';
import { RmCollectorsCacheService } from '../../../core/services/rm/rm-collectors-cache.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';

@Component({
  selector: 'app-rm-collector-assign-sheet',
  templateUrl: './rm-collector-assign-sheet.component.html',
  styleUrls: ['./rm-collector-assign-sheet.component.scss'],
  standalone: false,
})
export class RmCollectorAssignSheetComponent implements OnInit {
  @Input() clients: RmPackClient[] = [];

  collectors: RmCollectorOption[] = [];
  selectedCreditCollector = '';
  selectedTontineCollector = '';
  transferInProgressCredits = false;
  submitting = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly toastCtrl: ToastController,
    private readonly write: RmCollectorAssignWriteService,
    private readonly collectorsCache: RmCollectorsCacheService
  ) {}

  async ngOnInit(): Promise<void> {
    this.collectors = await this.collectorsCache.list();
    void this.collectorsCache.refreshIfOnline().then(list => {
      if (list.length) {
        this.collectors = list;
      }
    });
  }

  get selectedCount(): number {
    return this.clients.length;
  }

  get canSubmit(): boolean {
    return !this.submitting && (!!this.selectedCreditCollector || !!this.selectedTontineCollector);
  }

  onCreditChange(): void {
    if (!this.selectedCreditCollector) {
      this.transferInProgressCredits = false;
    }
  }

  label(collector: RmCollectorOption): string {
    return `${collector.displayName || collector.username} (${collector.username})`;
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }
    this.submitting = true;
    try {
      const result = await this.write.assign({
        clientIds: this.clients.map(c => c.id),
        collector: this.selectedCreditCollector || undefined,
        tontineCollector: this.selectedTontineCollector || undefined,
        transferInProgressCredits: this.transferInProgressCredits && !!this.selectedCreditCollector
      });
      const onlineCredits = result.mode === 'online' && this.transferInProgressCredits && this.selectedCreditCollector;
      await this.toast(
        result.mode === 'online'
          ? (onlineCredits
            ? 'Changement de commercial effectué. Le transfert des ventes en cours a été lancé.'
            : 'Changement de commercial effectué avec succès.')
          : 'Changement enregistré hors ligne — sync ultérieure',
        result.mode === 'online' ? 'success' : 'warning'
      );
      await this.modalCtrl.dismiss({ mode: result.mode, op: result.op }, 'confirm');
    } catch (error) {
      await this.toast(
        error instanceof OnlineWriteError || error instanceof Error
          ? error.message
          : 'Échec du changement de commercial',
        'danger'
      );
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
