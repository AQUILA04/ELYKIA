import { Injectable } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { MemoryManagementService } from './memory-management.service';
import { LoggerService } from './logger.service';
import { BehaviorSubject, interval } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MemoryAlertService {
  private lastAlertTime = 0;
  private alertCooldown = 5 * 60 * 1000; // 5 minutes entre les alertes
  private isMonitoring$ = new BehaviorSubject<boolean>(false);

  constructor(
    private memoryManagementService: MemoryManagementService,
    private toastController: ToastController,
    private alertController: AlertController,
    private logger: LoggerService
  ) {}

  /**
   * Démarre la surveillance automatique de la mémoire
   */
  startMemoryMonitoring(): void {
    if (this.isMonitoring$.value) {
      return; // Déjà en cours de surveillance
    }

    this.isMonitoring$.next(true);
    this.logger.log('[MemoryAlert] Démarrage de la surveillance mémoire automatique');

    // Vérifier la mémoire toutes les 2 minutes
    interval(2 * 60 * 1000).pipe(
      filter(() => this.isMonitoring$.value),
      switchMap(() => this.memoryManagementService.getMemoryStats())
    ).subscribe(stats => {
      if (stats && this.shouldShowAlert(stats.usedPercentage)) {
        this.showMemoryAlert(stats.usedPercentage);
      }
    });
  }

  /**
   * Arrête la surveillance automatique
   */
  stopMemoryMonitoring(): void {
    this.isMonitoring$.next(false);
    this.logger.log('[MemoryAlert] Arrêt de la surveillance mémoire automatique');
  }

  /**
   * Vérifie si une alerte doit être affichée
   */
  private shouldShowAlert(usedPercentage: number): boolean {
    const now = Date.now();
    const timeSinceLastAlert = now - this.lastAlertTime;
    
    // Afficher une alerte si :
    // 1. La mémoire est critique (>85%)
    // 2. Assez de temps s'est écoulé depuis la dernière alerte
    return usedPercentage > 85 && timeSinceLastAlert > this.alertCooldown;
  }

  /**
   * Affiche une alerte mémoire
   */
  private async showMemoryAlert(usedPercentage: number): Promise<void> {
    this.lastAlertTime = Date.now();
    
    const alert = await this.alertController.create({
      header: '⚠️ Mémoire critique',
      message: `L'utilisation mémoire est élevée (${usedPercentage.toFixed(1)}%). Voulez-vous libérer de la mémoire maintenant ?`,
      buttons: [
        {
          text: 'Plus tard',
          role: 'cancel',
          handler: () => {
            this.showMemoryToast();
          }
        },
        {
          text: 'Libérer maintenant',
          handler: async () => {
            await this.performQuickMemoryCleanup();
          }
        }
      ]
    });

    await alert.present();
    this.logger.log(`[MemoryAlert] Alerte mémoire affichée - ${usedPercentage}%`);
  }

  /**
   * Affiche un toast de rappel
   */
  private async showMemoryToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: '💡 Pensez à libérer la mémoire dans Paramètres > Stockage',
      duration: 4000,
      position: 'top',
      color: 'warning',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  /**
   * Effectue un nettoyage rapide de la mémoire
   */
  private async performQuickMemoryCleanup(): Promise<void> {
    try {
      const result = await this.memoryManagementService.clearMemoryCache();
      
      if (result.success) {
        const toast = await this.toastController.create({
          message: '✅ Mémoire libérée avec succès',
          duration: 3000,
          position: 'top',
          color: 'success'
        });
        await toast.present();
      } else {
        const toast = await this.toastController.create({
          message: '❌ Erreur lors de la libération mémoire',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error) {
      this.logger.log('[MemoryAlert] Erreur lors du nettoyage automatique');
    }
  }

  /**
   * Force une vérification immédiate de la mémoire
   */
  async checkMemoryNow(): Promise<void> {
    const stats = await this.memoryManagementService.getMemoryStats().toPromise();
    if (stats && stats.usedPercentage > 85) {
      // Ignorer le cooldown pour une vérification manuelle
      this.lastAlertTime = 0;
      await this.showMemoryAlert(stats.usedPercentage);
    }
  }
}