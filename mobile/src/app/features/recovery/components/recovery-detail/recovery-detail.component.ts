import { Component, Input, OnInit } from '@angular/core';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';
import { RecoveryView } from '../../../../models/recovery-view.model';
import { RecoveryService } from '../../../../core/services/recovery.service';

@Component({
  selector: 'app-recovery-detail',
  templateUrl: './recovery-detail.component.html',
  styleUrls: ['./recovery-detail.component.scss'],
  standalone: false
})
export class RecoveryDetailComponent implements OnInit {

  @Input() recoveryId!: string;
  recovery$: Observable<RecoveryView | undefined> = new Observable();

  constructor(
    private store: Store,
    private modalController: ModalController,
    private recoveryService: RecoveryService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
  }

  ngOnInit() {
    this.recovery$ = this.store.select(RecoverySelectors.selectRecoveryViewById(this.recoveryId));
  }

  dismiss(deleted = false) {
    this.modalController.dismiss({ deleted });
  }

  async deleteLocalRecovery(recovery: RecoveryView): Promise<void> {
    if (recovery.isSync) {
      const toast = await this.toastController.create({
        message: 'Impossible de supprimer un recouvrement déjà synchronisé.',
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: `Supprimer le recouvrement local ${recovery.reference || recovery.id} ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            void this.performDelete(recovery);
          }
        }
      ]
    });
    await alert.present();
  }

  private async performDelete(recovery: RecoveryView): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();

    try {
      await this.recoveryService.deleteLocalUnsyncedRecovery(recovery.id);
      const toast = await this.toastController.create({
        message: 'Recouvrement local supprimé.',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.dismiss(true);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: error?.message || 'Erreur lors de la suppression',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

}
