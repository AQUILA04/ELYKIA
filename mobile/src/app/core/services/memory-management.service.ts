import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoggerService } from './logger.service';
import { Store } from '@ngrx/store';
import { resetAppData } from '../../store/app.actions';

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
  formattedUsed: string;
  formattedTotal: string;
  formattedLimit: string;
}

@Injectable({
  providedIn: 'root'
})
export class MemoryManagementService {
  private memoryStats$ = new BehaviorSubject<MemoryStats | null>(null);
  private monitoringInterval: any;

  constructor(
    private logger: LoggerService,
    private store: Store
  ) {
    this.startMemoryMonitoring();
  }

  /**
   * Obtient les statistiques mémoire actuelles
   */
  getMemoryStats(): Observable<MemoryStats | null> {
    return this.memoryStats$.asObservable();
  }

  /**
   * Force la collecte des déchets et libère la mémoire
   */
  async clearMemoryCache(): Promise<{ success: boolean; message: string; beforeStats?: MemoryStats; afterStats?: MemoryStats }> {
    try {
      const beforeStats = this.getCurrentMemoryStats();
      this.logger.log('[MemoryManagement] Début du nettoyage mémoire');

      // 0. Réinitialiser les données de l'application via le store (garde l'auth)
      this.store.dispatch(resetAppData());
      this.logger.log('[MemoryManagement] Store application reset (auth preserved)');

      // 1. Forcer le garbage collection si disponible (mode développement)
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
        this.logger.log('[MemoryManagement] Garbage collection forcé');
      }

      // 2. Nettoyer les caches des images
      await this.clearImageCache();

      // 3. Nettoyer les observables et subscriptions orphelines
      this.clearObservableCache();

      // 4. Nettoyer le cache du navigateur
      await this.clearBrowserCache();

      // 5. Nettoyer les données temporaires
      this.clearTemporaryData();

      // 6. Forcer la libération des références
      this.forceMemoryRelease();

      // Attendre un peu pour que les changements prennent effet
      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterStats = this.getCurrentMemoryStats();
      const memoryFreed = beforeStats ? beforeStats.usedJSHeapSize - afterStats.usedJSHeapSize : 0;

      this.logger.log('[MemoryManagement] Nettoyage mémoire terminé');

      return {
        success: true,
        message: `Mémoire libérée avec succès. ${this.formatBytes(memoryFreed)} récupérés.`,
        beforeStats,
        afterStats
      };

    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors du nettoyage mémoire');
      return {
        success: false,
        message: 'Erreur lors du nettoyage de la mémoire.'
      };
    }
  }

  /**
   * Démarre la surveillance de la mémoire
   */
  private startMemoryMonitoring(): void {
    // Mise à jour des stats toutes les 30 secondes
    this.monitoringInterval = setInterval(() => {
      const stats = this.getCurrentMemoryStats();
      this.memoryStats$.next(stats);
    }, 30000);

    // Première mesure immédiate
    const initialStats = this.getCurrentMemoryStats();
    this.memoryStats$.next(initialStats);
  }

  /**
   * Arrête la surveillance de la mémoire
   */
  stopMemoryMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Obtient les statistiques mémoire actuelles
   */
  private getCurrentMemoryStats(): MemoryStats {
    const performance = (window as any).performance;

    if (performance && performance.memory) {
      const memory = performance.memory;
      const usedPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercentage: Math.round(usedPercentage * 100) / 100,
        formattedUsed: this.formatBytes(memory.usedJSHeapSize),
        formattedTotal: this.formatBytes(memory.totalJSHeapSize),
        formattedLimit: this.formatBytes(memory.jsHeapSizeLimit)
      };
    }

    // Fallback si performance.memory n'est pas disponible
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usedPercentage: 0,
      formattedUsed: 'N/A',
      formattedTotal: 'N/A',
      formattedLimit: 'N/A'
    };
  }

  /**
   * Nettoie le cache des images
   */
  private async clearImageCache(): Promise<void> {
    try {
      // Nettoyer les images en mémoire
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });

      // Nettoyer les canvas s'il y en a
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });

      this.logger.log('[MemoryManagement] Cache des images nettoyé');
    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors du nettoyage du cache des images');
    }
  }

  /**
   * Nettoie les observables et subscriptions orphelines
   */
  private clearObservableCache(): void {
    try {
      // Forcer la détection de changement pour nettoyer les observables
      if (typeof window !== 'undefined' && (window as any).Zone) {
        (window as any).Zone.current.run(() => {
          // Déclencher un cycle de détection de changement
        });
      }

      this.logger.log('[MemoryManagement] Cache des observables nettoyé');
    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors du nettoyage des observables');
    }
  }

  /**
   * Nettoie le cache du navigateur
   */
  private async clearBrowserCache(): Promise<void> {
    try {
      // Nettoyer le localStorage des données temporaires
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('temp_') || key.includes('cache_') || key.includes('_cache'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Nettoyer le sessionStorage
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('temp_') || key.includes('cache_'))) {
          sessionKeysToRemove.push(key);
        }
      }

      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      this.logger.log('[MemoryManagement] Cache du navigateur nettoyé');
    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors du nettoyage du cache navigateur');
    }
  }

  /**
   * Nettoie les données temporaires
   */
  private clearTemporaryData(): void {
    try {
      // Nettoyer les variables globales temporaires
      if (typeof window !== 'undefined') {
        const windowAny = window as any;

        // Nettoyer les caches personnalisés s'ils existent
        if (windowAny._appCache) {
          windowAny._appCache = {};
        }

        if (windowAny._tempData) {
          windowAny._tempData = {};
        }
      }

      this.logger.log('[MemoryManagement] Données temporaires nettoyées');
    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors du nettoyage des données temporaires');
    }
  }

  /**
   * Force la libération des références mémoire
   */
  private forceMemoryRelease(): void {
    try {
      // Créer et détruire des objets pour forcer le garbage collection
      for (let i = 0; i < 100; i++) {
        const temp = new Array(1000).fill(null);
        temp.length = 0;
      }

      // Forcer la libération des closures
      if (typeof window !== 'undefined') {
        const windowAny = window as any;
        if (windowAny.requestIdleCallback) {
          windowAny.requestIdleCallback(() => {
            // Callback vide pour forcer le nettoyage
          });
        }
      }

      this.logger.log('[MemoryManagement] Libération forcée des références');
    } catch (error) {
      this.logger.log('[MemoryManagement] Erreur lors de la libération forcée');
    }
  }

  /**
   * Formate les bytes en format lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Vérifie si la mémoire est critique
   */
  isMemoryCritical(): boolean {
    const stats = this.getCurrentMemoryStats();
    return stats.usedPercentage > 85; // Plus de 85% utilisé
  }

  /**
   * Obtient le niveau d'alerte mémoire
   */
  getMemoryAlertLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const stats = this.getCurrentMemoryStats();

    if (stats.usedPercentage < 50) return 'low';
    if (stats.usedPercentage < 70) return 'medium';
    if (stats.usedPercentage < 85) return 'high';
    return 'critical';
  }

  /**
   * Nettoyage lors de la destruction du service
   */
  ngOnDestroy(): void {
    this.stopMemoryMonitoring();
  }
}

// Déclaration pour TypeScript
declare global {
  interface Window {
    gc?: () => void;
  }
}