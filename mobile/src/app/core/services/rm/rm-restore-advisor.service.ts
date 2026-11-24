import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { DataInitializationService } from '../data-initialization.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { RmPendingSyncCoordinator } from './rm-pending-sync.coordinator';
import { RmPendingQueuesService } from './rm-pending-queues.service';
import { countUnsyncedRmOpsInBackup } from './rm-restore.util';

export interface RecoverableBackup {
  path: string;
  unsyncedCount: number;
}

/**
 * Détecte, à l'ouverture d'une session RM, des saisies non envoyées qui existent dans une sauvegarde
 * mais plus dans la base (files vidées). Ne restaure jamais seul : l'utilisateur décide.
 */
@Injectable({ providedIn: 'root' })
export class RmRestoreAdvisorService {
  /** Nombre de sauvegardes récentes examinées. */
  static readonly BACKUPS_SCANNED = 5;

  constructor(
    private readonly database: DatabaseService,
    private readonly pending: RmPendingQueuesService,
    private readonly dataInitialization: DataInitializationService,
    private readonly pendingSync: RmPendingSyncCoordinator,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
    private readonly log: LoggerService
  ) {}

  /**
   * À appeler AVANT l'écriture de la sauvegarde de début de session (sinon la plus récente
   * refléterait déjà la base vide). Renvoie la sauvegarde la plus récente qui contient des saisies.
   */
  async findRecoverableBackup(): Promise<RecoverableBackup | null> {
    try {
      if (await this.pending.hasPending()) {
        return null;
      }
      const files = await this.database.listBackupFiles(RmRestoreAdvisorService.BACKUPS_SCANNED);
      for (const path of files) {
        const sql = await this.database.readBackupFile(path);
        const unsyncedCount = sql ? countUnsyncedRmOpsInBackup(sql) : 0;
        if (unsyncedCount > 0) {
          void this.log.log(`[RmRestoreAdvisor] ${unsyncedCount} saisie(s) non envoyée(s) retrouvée(s) dans ${path}.`);
          return { path, unsyncedCount };
        }
      }
    } catch (error) {
      console.warn('[RmRestoreAdvisor] analyse des sauvegardes impossible', error);
    }
    return null;
  }

  async propose(candidate: RecoverableBackup): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Saisies retrouvées',
      message: `Une sauvegarde de ce téléphone contient ${candidate.unsyncedCount} saisie(s) non envoyée(s) `
        + "qui ne sont plus dans l'application. Les restaurer maintenant ? Votre état actuel est copié avant.",
      buttons: [
        { text: 'Plus tard', role: 'cancel' },
        { text: 'Restaurer', handler: () => { void this.restore(candidate); } },
      ],
    });
    await alert.present();
  }

  private async restore(candidate: RecoverableBackup): Promise<void> {
    try {
      const result = await this.dataInitialization.restoreFromBackup(candidate.path);
      await this.toast(
        result.success ? 'Saisies restaurées. Envoi en cours…' : 'La restauration a échoué, rien n\'a été modifié.',
        result.success ? 'success' : 'danger'
      );
      if (result.success) {
        this.pendingSync.request('restauration');
      }
    } catch (error) {
      console.error('[RmRestoreAdvisor] restauration impossible', error);
      await this.toast('La restauration a échoué, rien n\'a été modifié.', 'danger');
    }
  }

  private async toast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'top' });
    await toast.present();
  }
}
