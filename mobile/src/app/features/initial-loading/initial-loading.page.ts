import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DataInitializationService } from '../../core/services/data-initialization.service';
import { interval, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';
import { InitializationStateService } from '../../core/services/initialization-state.service';
import { Storage } from '@ionic/storage-angular';
import { LoggerService } from '../../core/services/logger.service';
import { HealthCheckService } from '../../core/services/health-check.service';

@Component({
  selector: 'app-initial-loading',
  templateUrl: './initial-loading.page.html',
  styleUrls: ['./initial-loading.page.scss'],
  standalone: false
})
export class InitialLoadingPage implements OnInit, OnDestroy {
  progress: number = 0;
  statusText: string = 'Préparation...';
  showSuccessAnimation: boolean = false;
  showCompletionMessage: boolean = false;
  private destroy$ = new Subject<void>();

  private initSteps = [
    { text: "Récupération des articles...", method: () => this.dataInitService.initializeArticles() },
    { text: "Récupération des commerciaux...", method: () => this.dataInitService.initializeCommercial() },
    { text: "Récupération des localités...", method: () => this.dataInitService.initializeLocalities() },
    { text: "Récupération des clients...", method: () => this.dataInitService.initializeClients() },
    { text: "Récupération du sorties d'articles...", method: () => this.dataInitService.initializeStockOutputs() },
    { text: "Récupération des distributions...", method: () => this.dataInitService.initializeDistributions() },
    { text: "Récupération des comptes client...", method: () => this.dataInitService.initializeAccounts() },
    { text: "Récupération des tontines...", method: () => this.dataInitService.initializeTontine() },
    { text: "Finalisation...", method: () => this.dataInitService.calculateArticleStocks() },
  ];
  private currentStepIndex: number = 0;
  private initializationComplete?: boolean;

  constructor(
    private router: Router,
    private dataInitService: DataInitializationService,
    private alertController: AlertController,
    private storage: Storage,
    private log: LoggerService,
    private healthCheckService: HealthCheckService
  ) { }

  ngOnInit() {
    this.loadInitializationStatus();
    this.startInitialization();
    this.pulseAnimation();
  }

  private async loadInitializationStatus(): Promise<void> {
    this.initializationComplete = await this.storage.get('initialization_complete');
  }
  isInitializationComplete(): boolean {
    return this.initializationComplete ?? false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async startInitialization() {
    const isOnline = await this.healthCheckService.pingBackend().pipe(take(1)).toPromise();

    if (!isOnline) {
      this.skipInitializationForOfflineMode();
      return;
    }
// ...
    if (this.currentStepIndex < this.initSteps.length) {
      const step = this.initSteps[this.currentStepIndex];
      this.statusText = step.text;
      const stepProgress = ((this.currentStepIndex + 1) / this.initSteps.length) * 100;
      this.progress = stepProgress;

      step.method().pipe(take(1)).subscribe({
        next: (success) => {
          if (success) {
            this.currentStepIndex++;
            this.startInitialization();
          } else {
            this.log.log(`[InitialLoadingPage] Step failed (returned false): ${step.text}`);
            console.error(`Initialization failed for step: ${step.text}`);
            this.presentErrorAlert(`Échec de l'initialisation: ${step.text.replace('...', '')}`);
          }
        },
        error: (err) => {
          this.log.log(`[InitialLoadingPage] Step failed with error: ${step.text} - ${JSON.stringify(err)}`);
          this.presentErrorAlert(`Erreur lors de l'initialisation: ${step.text.replace('...', '')}. Détails: ${err.message || err}`);
        }
      });
    } else {
      this.completeInitialization();
    }
  }

  private async presentErrorAlert(message: string) {
    this.storage.remove('initialization_complete');
    const alert = await this.alertController.create({
      header: 'Erreur d\'initialisation',
      message: message,
      buttons: [
        {
          text: 'Réessayer',
          handler: () => {
            this.startInitialization();
          },
        },
        {
          text: 'Continuer (données limitées)',
          handler: () => {
            this.router.navigateByUrl('/tabs');
          },
        },
      ],
    });
    await alert.present();
  }

  private skipInitializationForOfflineMode() {
    this.statusText = "Mode hors ligne détecté";
    this.progress = 100;

    setTimeout(() => {
      this.statusText = "Accès aux données locales...";
      setTimeout(() => {
        this.showSuccessAnimation = true;
        setTimeout(() => {
          this.showCompletionMessage = true;
          setTimeout(() => {
            this.router.navigateByUrl('/tabs');
          }, 1000);
        }, 300);
      }, 500);
    }, 500);
  }

  private completeInitialization() {
    this.storage.set('initialization_complete', true);
    this.statusText = "Initialisation terminée !";
    this.progress = 100;

    this.performBackgroundBackup();

    setTimeout(() => {
      this.showSuccessAnimation = true;
      setTimeout(() => {
        this.showCompletionMessage = true;
        setTimeout(() => {
          this.router.navigateByUrl('/tabs');
        }, 2000);
      }, 600);
    }, 500);
  }

  private performBackgroundBackup() {
    this.dataInitService.backupDatabase().pipe(take(1)).subscribe({
      next: (success) => {
        if (success) {
          this.log.log('[InitialLoadingPage] Background database backup completed successfully');
        } else {
          this.log.log('[InitialLoadingPage] Background database backup failed but not blocking user experience');
        }
      },
      error: (error) => {
        this.log.log(`[InitialLoadingPage] Background database backup error (non-blocking): ${error.message || error}`);
        console.warn('Background backup failed:', error);
      }
    });
  }

  private pulseAnimation() {
    const logo = document.querySelector('.loading-logo');
    if (logo) {
      interval(3000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        logo.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.1)' },
          { transform: 'scale(1)' }
        ], {
          duration: 600,
          easing: 'ease-in-out'
        });
      });
    }
  }
}
