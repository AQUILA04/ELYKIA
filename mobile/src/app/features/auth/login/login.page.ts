import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthState } from 'src/app/store/auth/auth.reducer';
import * as AuthActions from 'src/app/store/auth/auth.actions';
import * as AuthSelectors from 'src/app/store/auth/auth.selectors';
import { AlertController, LoadingController, ModalController, ToastController, AlertInput } from '@ionic/angular';
import { selectIsOnline } from 'src/app/store/health-check/health-check.selectors';
import { LoggerService } from '../../../core/services/logger.service';
import { LogModalComponent } from 'src/app/shared/components/log-modal/log-modal.component';
import { Actions, ofType } from '@ngrx/effects';
import { DataInitializationService } from 'src/app/core/services/data-initialization.service';
import { DatabaseService } from 'src/app/core/services/database.service'; // Import DatabaseService
import { environment } from 'src/environments/environment'; // Import environment
import { RestoreResult } from 'src/app/core/models/restore.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit, OnDestroy {

  username!: string;
  password!: string;
  passwordVisible: boolean = false;
  appVersion: string = environment.version; // Expose version to template
  environment = environment; // Exposer environment pour le template

  isOnline$: Observable<boolean>;
  error$: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AuthState>,
    private alertController: AlertController,
    private modalController: ModalController,
    private actions$: Actions,
    private toastController: ToastController,
    private log: LoggerService,
    private dataInitializationService: DataInitializationService,
    private loadingController: LoadingController,
    private dbService: DatabaseService // Inject DatabaseService
  ) {
    this.error$ = this.store.select(AuthSelectors.selectAuthError);
    this.isOnline$ = this.store.select(selectIsOnline);
  }

  ngOnInit() {
    // Listen for login failure to show an alert
    this.actions$.pipe(
      ofType(AuthActions.loginFailure),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.presentAlert('Erreur de connexion', error || 'Les identifiants fournis sont incorrects ou un problème est survenu.');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogin() {
    this.store.dispatch(AuthActions.login({ request: { username: this.username, password: this.password } }));
  }

  async onRestore() {
    const backupFiles = await this.dbService.findAllBackupFiles();

    if (backupFiles.length === 0) {
      // Proposer la sélection manuelle via SAF si aucun fichier trouvé automatiquement
      const alert = await this.alertController.create({
        header: 'Aucune sauvegarde trouvée',
        message: 'Aucun fichier de sauvegarde n\'a été trouvé automatiquement. Voulez-vous sélectionner manuellement un fichier de sauvegarde ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Sélectionner manuellement',
            handler: async () => {
              await this.onManualRestore();
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    const radioOptions: AlertInput[] = backupFiles.map(fileObj => {
      // Extract timestamp from filename: db-backup-YYYY-MM-DDTHH-MM-SS.SSSZ.sql
      const match = fileObj.path.match(/db-backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      let label = 'Sauvegarde inconnue';
      if (match && match[1]) {
        try {
          // Convert to readable format: YYYY-MM-DD HH:MM:SS
          const datePart = match[1].substring(0, 10);
          const timePart = match[1].substring(11).replace(/-/g, ':');

          // Format file size
          const fileSizeKB = (fileObj.size / 1024).toFixed(2); // Convert bytes to KB
          label = `Sauvegarde du ${datePart} à ${timePart} (${fileSizeKB} KB)`;
        } catch (e) {
          console.error('Error parsing date from backup filename', e);
        }
      }

      return {
        name: fileObj.path,
        type: 'radio',
        label: label,
        value: fileObj.path,
        checked: fileObj.path === backupFiles[0].path // Check the latest one by default
      };
    });

    const selectAlert = await this.alertController.create({
      header: 'Sélectionner une sauvegarde',
      message: 'Veuillez choisir le fichier de sauvegarde à restaurer. Cela remplacera les données non synchronisées actuelles par celles de la sauvegarde, puis lancera une synchronisation complète.',
      inputs: radioOptions,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Sélection manuelle',
          handler: async () => {
            await this.onManualRestore();
          }
        },
        {
          text: 'Restaurer',
          handler: async (selectedFilePath: string) => {
            if (!selectedFilePath) {
              await this.presentAlert('Erreur', 'Aucun fichier de sauvegarde sélectionné.');
              return;
            }

            const loading = await this.loadingController.create({
              message: `Restauration de ${selectedFilePath.split('/').pop()} en cours...`,
            });
            await loading.present();

            try {
              const result = await this.dataInitializationService.restoreFromBackup(selectedFilePath);
              await loading.dismiss();

              const message = result.success
                ? `Restauration terminée.\nSuccès: ${result.successfulStatements}\nErreurs: ${result.failedStatements}`
                : `Restauration terminée avec des erreurs.\nSuccès: ${result.successfulStatements}\nErreurs: ${result.failedStatements}`;

              const color = result.success ? 'success' : 'warning';

              const toast = await this.toastController.create({
                message: message,
                duration: 5000,
                color: color,
                position: 'top'
              });
              await toast.present();
            } catch (error: any) {
              await loading.dismiss();
              await this.presentAlert('Erreur de restauration', error.message || 'Une erreur est survenue lors de la restauration.');
            }
          }
        }
      ]
    });

    await selectAlert.present();
  }

  /**
   * Restauration manuelle via Storage Access Framework
   */
  async onManualRestore() {
    const loading = await this.loadingController.create({
      message: 'Ouverture du sélecteur de fichiers...'
    });
    await loading.present();

    try {
      // Utiliser la nouvelle méthode de restauration manuelle
      const result = await this.dbService.restoreFromManualSelection();

      await loading.dismiss();

      if (result.success) {
        const message = `Restauration manuelle terminée.\nSuccès: ${result.successfulStatements}\nErreurs: ${result.failedStatements}`;
        const toast = await this.toastController.create({
          message: message,
          duration: 5000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
      } else {
        const errorMsg = result.errors.length > 0
          ? result.errors.map((e: any) => e.error).join('\n')
          : 'Erreur inconnue';

        await this.presentAlert('Echec de la restauration', `La restauration a échoué.\n${errorMsg}`);
      }

    } catch (error: any) {
      await loading.dismiss();

      if (error.message?.includes('No backup file selected')) {
        // L'utilisateur a annulé la sélection
        return;
      }

      await this.presentAlert('Erreur de restauration manuelle', error.message || 'Une erreur est survenue lors de la restauration manuelle.');
    }
  }

  /**
   * Méthode de test pour diagnostiquer les problèmes d'accès aux fichiers
   */
  async onTestFileAccess() {
    console.log('🧪 Starting file access test from UI...');

    const loading = await this.loadingController.create({
      message: 'Test d\'accès aux fichiers en cours...'
    });
    await loading.present();

    try {
      // Appeler la méthode de test du service
      await this.dbService.testCrossInstallationFileAccess();

      await loading.dismiss();

      // Afficher les résultats
      const files = await this.dbService.findAllBackupFiles();
      const message = files.length > 0
        ? `✅ Test réussi ! ${files.length} fichier(s) trouvé(s):\n${files.map(f => `• ${f.path} (${f.size} bytes)`).join('\n')}`
        : '❌ Aucun fichier de backup trouvé';

      await this.presentAlert('Résultat du test', message);

    } catch (error) {
      await loading.dismiss();
      console.error('Test failed:', error);
      await this.presentAlert('Erreur', `Le test a échoué: ${error}`);
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    });
    await alert.present();
  }

  async showLogs() {
    const logs = await this.log.readLogs();
    const modal = await this.modalController.create({
      component: LogModalComponent,
      componentProps: {
        logs: logs
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.clear) {
      await this.log.clearLogFile();
      this.log.clearLogs();
      const toast = await this.toastController.create({
        message: 'Logs effacés',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    }
  }
}