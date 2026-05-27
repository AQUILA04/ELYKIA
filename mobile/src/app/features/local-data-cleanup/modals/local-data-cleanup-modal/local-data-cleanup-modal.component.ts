import { Component, Input, LOCALE_ID, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import {
  AlertController,
  IonicModule,
  LoadingController,
  ModalController,
  ToastController
} from '@ionic/angular';
import { LocalDataCleanupService } from '../../../../core/local-data-cleanup/local-data-cleanup.service';
import { LocalDataCleanupTriggerAction } from '../../../../core/local-data-cleanup/models/local-data-cleanup-history.model';
import { LocalDataCleanupSection } from '../../../../core/local-data-cleanup/models/local-data-cleanup.model';

registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

@Component({
  selector: 'app-local-data-cleanup-modal',
  templateUrl: './local-data-cleanup-modal.component.html',
  styleUrls: ['./local-data-cleanup-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, DatePipe, DecimalPipe],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }]
})
export class LocalDataCleanupModalComponent implements OnInit {
  @Input() commercialUsername!: string;
  @Input() sections: LocalDataCleanupSection[] = [];

  selectedIds = new Set<string>();
  isDeleting = false;
  private deleteTriggerAction: LocalDataCleanupTriggerAction = LocalDataCleanupTriggerAction.DeleteSelected;

  constructor(
    private readonly modalController: ModalController,
    private readonly cleanupService: LocalDataCleanupService,
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.selectAll();
  }

  get totalItemCount(): number {
    return this.sections.reduce((sum, section) => sum + section.items.length, 0);
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  onCheckboxChange(id: string, event: CustomEvent<{ checked: boolean }>): void {
    if (event.detail.checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  selectAll(): void {
    const ids: string[] = [];
    for (const section of this.sections) {
      for (const item of section.items) {
        ids.push(item.id);
      }
    }
    this.selectedIds = new Set(ids);
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  async dismissKeep(): Promise<void> {
    await this.cleanupService.markPromptHandledForToday(this.commercialUsername);
    await this.modalController.dismiss({ kept: true });
  }

  async confirmDeleteAll(): Promise<void> {
    this.selectAll();
    this.deleteTriggerAction = LocalDataCleanupTriggerAction.DeleteAll;
    await this.confirmDeleteSelected('Supprimer toutes les données listées ?');
  }

  async confirmDeleteSelected(message?: string): Promise<void> {
    if (this.selectedCount === 0) {
      await this.showToast('Sélectionnez au moins un élément à supprimer.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: message ?? `Supprimer ${this.selectedCount} élément(s) sélectionné(s) ? Cette action est irréversible.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            void this.executeDelete();
          }
        }
      ]
    });
    await alert.present();
  }

  private async executeDelete(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...',
      backdropDismiss: false
    });
    await loading.present();
    this.isDeleting = true;

    try {
      const auditItems = this.cleanupService.collectAuditItems(this.sections, this.selectedIds);
      const selection = this.cleanupService.buildSelectionFromSections(
        this.sections,
        this.selectedIds
      );
      const result = await this.cleanupService.deleteSelection(
        this.commercialUsername,
        selection,
        {
          auditItems,
          triggerAction: this.deleteTriggerAction
        }
      );
      await this.cleanupService.markPromptHandledForToday(this.commercialUsername);
      await loading.dismiss();
      await this.modalController.dismiss({
        deleted: true,
        totalDeleted: result.totalDeleted,
        deletedByType: result.deletedByType
      });
    } catch (error) {
      await loading.dismiss();
      console.error('Local data cleanup delete failed:', error);
      await this.showToast('Erreur lors de la suppression.', 'danger');
    } finally {
      this.isDeleting = false;
      this.deleteTriggerAction = LocalDataCleanupTriggerAction.DeleteSelected;
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
