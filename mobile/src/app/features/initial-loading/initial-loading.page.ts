import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DataInitializationService } from '../../core/services/data-initialization.service';
import { interval, Subject, from } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';
import { InitializationStateService } from '../../core/services/initialization-state.service';
import { Storage } from '@ionic/storage-angular';
import { LoggerService } from '../../core/services/logger.service';
import { HealthCheckService } from '../../core/services/health-check.service';
import { InitializationValidationService } from '../../core/services/initialization-validation.service';
import { resetAppData } from '../../store/app.actions';
import { Store } from '@ngrx/store';
import { MemoryManagementService } from '../../core/services/memory-management.service';
import { DatabaseService } from '../../core/services/database.service';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { AuthService } from '../../core/services/auth.service';
import * as KpiActions from '../../store/kpi/kpi.actions';

@Component({
  selector: 'app-initial-loading',
  templateUrl: './initial-loading.page.html',
  styleUrls: ['./initial-loading.page.scss'],
  standalone: false
})
export class InitialLoadingPage implements OnInit, OnDestroy {
  progress = 0;
  statusText = 'Démarrage...';
  showSuccessAnimation = false;
  showCompletionMessage = false;
  private destroy$ = new Subject<void>();
  currentStepIndex = 0;

  initSteps: { text: string; method: () => any }[] = [
    { text: 'Vérification de la connexion...', method: () => this.healthCheckService.pingBackend() },
    { text: 'Chargement des paramètres...', method: () => this.dataInitService.initializeParameters() },
    { text: 'Chargement des articles...', method: () => this.dataInitService.initializeArticles() },
    { text: 'Chargement des infos commerciales...', method: () => this.dataInitService.initializeCommercial() },
    { text: 'Chargement des localités...', method: () => this.dataInitService.initializeLocalities() },
    { text: 'Chargement des clients...', method: () => this.dataInitService.initializeClients() },
    { text: 'Chargement des sorties de stock...', method: () => this.dataInitService.initializeStockOutputs() },
    { text: 'Sync du stock commercial...', method: () => this.dataInitService.initializeCommercialStock() },
    { text: 'Chargement des distributions...', method: () => this.dataInitService.initializeDistributions() },
    { text: 'Chargement des comptes...', method: () => this.dataInitService.initializeAccounts() },
    { text: 'Chargement des recouvrements...', method: () => this.dataInitService.initializeRecoveries() },
    { text: 'Chargement de la tontine...', method: () => this.dataInitService.initializeTontine() },
    { text: 'Calcul des stocks...', method: () => this.dataInitService.calculateArticleStocks() },
    { text: 'Détection des correspondances...', method: () => from(this.detectOrphanedDependencies()) }
  ];

  constructor(
    private router: Router,
    private dataInitService: DataInitializationService,
    private alertController: AlertController,
    private storage: Storage,
    private log: LoggerService,
    private healthCheckService: HealthCheckService,
    private store: Store,
    private memoryManagementService: MemoryManagementService,
    private dbService: DatabaseService,
    private initValidationService: InitializationValidationService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.startInitialization();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async startInitialization() {
    // Nettoyage de la mémoire avant le début de l'initialisation (uniquement au début)
    if (this.currentStepIndex === 0) {
      try {
        // Nettoyage de la mémoire avant le début de l'initialisation (uniquement au début)
        if (this.currentStepIndex === 0) {
          try {
            // 2. Nettoyer la mémoire cache
            this.statusText = "Optimisation de la mémoire...";
            await this.memoryManagementService.clearMemoryCache();
            this.log.log('[InitialLoadingPage] Memory cache cleared successfully');
          } catch (error) {
            this.log.log(`[InitialLoadingPage] Failed to clear memory/state: ${error}`);
            console.warn('Failed to clear memory cache:', error);
          }
        }
      } catch (error) {
        this.log.log(`[InitialLoadingPage] Failed to clear memory/state: ${error}`);
        console.warn('Failed to clear memory cache:', error);
      }
    }

    const isOnline = await this.healthCheckService.pingBackend().pipe(take(1)).toPromise();

    if (!isOnline) {
      this.skipInitializationForOfflineMode();
      return;
    }

    if (this.currentStepIndex < this.initSteps.length) {
      const step = this.initSteps[this.currentStepIndex];
      this.statusText = step.text;
      const stepProgress = ((this.currentStepIndex + 1) / this.initSteps.length) * 100;
      this.progress = stepProgress;

      step.method().pipe(take(1)).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.currentStepIndex++;
            this.startInitialization();
          } else {
            this.log.log(`[InitialLoadingPage] Step failed (returned false): ${step.text}`);
            console.error(`Initialization failed for step: ${step.text}`);
            this.presentErrorAlert(`Échec de l'initialisation: ${step.text.replace('...', '')}`);
          }
        },
        error: (err: any) => {
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
            this.router.navigateByUrl('/tabs', { replaceUrl: true });
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
            this.router.navigateByUrl('/tabs', { replaceUrl: true });
          }, 1000);
        }, 300);
      }, 500);
    }, 500);
  }

  private async completeInitialization() {
    // Vérifier la complétude des données
    this.statusText = "Vérification de la complétude des données...";

    try {
      let user = await this.store.select(selectAuthUser).pipe(take(1)).toPromise();

      // Fallback: si l'utilisateur n'est pas dans le store, essayer via AuthService
      if (!user || !user.username) {
        this.log.log('[InitialLoadingPage] User not found in store, checking AuthService...');
        user = this.authService.currentUser;
      }

      if (user && user.username) {
        this.log.log('[InitialLoadingPage] Validating data completeness for: ' + user.username);

        const comparisonResult = await this.initValidationService.validateInitialization(user.username)
          .pipe(take(1)).toPromise();

        if (comparisonResult && comparisonResult.isComplete) {
          this.log.log('[InitialLoadingPage] ✅ Data validation successful - all data complete');
          await this.initValidationService.markInitializationComplete();
          await this.storage.set('initialization_complete', true);
          this.statusText = "Initialisation terminée !";
          this.progress = 100;
        } else if (comparisonResult) {
          this.log.log('[InitialLoadingPage] ⚠️ Data validation warning - some data missing: ' + JSON.stringify(comparisonResult.missingData));
          // Afficher un avertissement mais continuer
          await this.presentDataIncompleteWarning(comparisonResult.missingData);
          // Marquer quand même comme complète pour permettre le travail, mais ne pas marquer la date si incomplet?
          // Décision: Marquer la date pour éviter le blocage offline, car l'utilisateur a vu l'avertissement.
          // OU: Ne pas marquer la date pour forcer une ré-init propre le lendemain?
          // Le doc VALIDATION dit: "Affiche un avertissement mais continue".
          // Et "connexion hors ligne (nouvelle journée) -> NON (car nouvelle journée)"
          // Donc on doit mettre à jour la date pour permettre le travail offline AUJOURD'HUI.
          await this.initValidationService.markInitializationComplete();
          await this.storage.set('initialization_complete', true);
          this.statusText = "Initialisation terminée (avec avertissements)";
          this.progress = 100;
        }

        // --- PRELOAD KPIS START ---
        this.statusText = "Préchargement des indicateurs...";
        // Use username as commercialId because repositories expect username for filtering
        const commercialId = user.username;
        const username = user.username;
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // Start of month
        const endDate = today.toISOString().split('T')[0];

        this.store.dispatch(KpiActions.loadAllKpi({
          commercialUsername: username,
          commercialId: commercialId, // Pass username as ID
          dateFilter: { startDate, endDate }
        }));
        // --- PRELOAD KPIS END ---

      } else {
        this.log.log('[InitialLoadingPage] CRITICAL: No user found even after fallback. Initialization incomplete.');
        // Ne PAS marquer initialization_complete pour éviter de coincer l'utilisateur
        // Rediriger vers login? Ou laisser l'utilisateur réessayer?
        this.presentErrorAlert("Erreur critique: Utilisateur non identifié. Veuillez vous reconnecter.");
        return;
      }
    } catch (error) {
      this.log.log(`[InitialLoadingPage] Data validation failed: ${error}`);
      console.error('Data validation error:', error);
      // En cas d'erreur technique (réseau, crash), on marque comme complet pour ne pas bloquer
      // mais on ne met pas à jour la date de validation stricte (donc offline login pourrait échouer demain, ce qui est bien)
      await this.storage.set('initialization_complete', true);
      this.statusText = "Initialisation terminée (validation ignorée)";
      this.progress = 100;
    }

    this.performBackgroundBackup();

    setTimeout(() => {
      this.showSuccessAnimation = true;
      setTimeout(() => {
        this.showCompletionMessage = true;
        setTimeout(() => {
          this.router.navigateByUrl('/tabs', { replaceUrl: true });
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

  /**
   * Détecter les dépendances orphelines et proposer des correspondances
   */
  private async detectOrphanedDependencies() {
    try {
      // Import dynamique du service de matching
      const { SyncDependencyMatcherService } = await import('../../core/services/sync-dependency-matcher.service');

      const matcherService = new SyncDependencyMatcherService(this.dbService);

      // Détecter les correspondances avec timeout de 5 secondes
      const summary = await matcherService.detectDependencyMatches();

      // Stocker les résultats dans le storage pour affichage ultérieur
      if (summary && summary.matches && summary.matches.length > 0) {
        await this.storage.set('orphaned_dependencies_detected', summary.matches);
        this.log.log(`[InitialLoadingPage] Detected ${summary.matches.length} orphaned dependencies with ${summary.highConfidenceMatches} high confidence matches`);
      }

      // Retourner Observable pour compatibilité avec initSteps
      return new Promise(resolve => resolve(true));
    } catch (error) {
      this.log.log(`[InitialLoadingPage] Error detecting orphaned dependencies: ${error}`);
      console.warn('Failed to detect orphaned dependencies:', error);
      // Ne pas bloquer l'initialisation en cas d'erreur
      return new Promise(resolve => resolve(true));
    }
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

  /**
   * Affiche un avertissement si les données sont incomplètes
   */
  private async presentDataIncompleteWarning(missingData: string[]) {
    const alert = await this.alertController.create({
      header: '⚠️ Données incomplètes',
      message: `Certaines données ne correspondent pas au serveur :\n\n${missingData.join('\n')}\n\nVous pouvez continuer à travailler, mais certaines informations peuvent être manquantes.`,
      buttons: [
        {
          text: 'Continuer',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }
}
