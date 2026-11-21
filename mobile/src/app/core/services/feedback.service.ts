import { Injectable } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import {
  ElykFeedbackAction,
  ElykFeedbackKind,
  ElykFeedbackModalComponent
} from '../../shared/components/elyk-feedback-modal/elyk-feedback-modal.component';
import { DEFAULT_USER_ERROR_MESSAGE, toUserErrorMessage } from '../utils/user-error-message.util';

export interface FeedbackOptions {
  title?: string;
  details?: string[];
  actions?: ElykFeedbackAction[];
}

/**
 * Fenêtres communes d'erreur et de succès. Elles remplacent les alertes Ionic simples et les toasts
 * d'erreur HTTP : le message vient toujours du backend (`Response.message`) ou d'un texte métier,
 * jamais du texte technique d'Angular.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly loadingCtrl: LoadingController
  ) {}

  /** Erreur : `error` peut être une `HttpErrorResponse`, une `Error` ou un texte. Renvoie le rôle du bouton. */
  async error(error: unknown, options: FeedbackOptions & { fallback?: string } = {}): Promise<string> {
    const message = toUserErrorMessage(error, options.fallback ?? DEFAULT_USER_ERROR_MESSAGE);
    return this.show('error', options.title ?? 'Opération impossible', message, options);
  }

  async success(message: string, options: FeedbackOptions = {}): Promise<string> {
    return this.show('success', options.title ?? 'C\'est fait', message, options);
  }

  async warning(message: string, options: FeedbackOptions = {}): Promise<string> {
    return this.show('warning', options.title ?? 'Attention', message, options);
  }

  async info(message: string, options: FeedbackOptions = {}): Promise<string> {
    return this.show('info', options.title ?? 'Information', message, options);
  }

  /** Question à deux boutons ; renvoie `true` si l'utilisateur confirme. */
  async confirm(message: string, options: FeedbackOptions & { confirmText?: string; cancelText?: string } = {}): Promise<boolean> {
    const role = await this.show('warning', options.title ?? 'Confirmer', message, {
      ...options,
      actions: [
        { role: 'cancel', text: options.cancelText ?? 'Annuler' },
        { role: 'confirm', text: options.confirmText ?? 'Confirmer', primary: true }
      ]
    });
    return role === 'confirm';
  }

  private async show(kind: ElykFeedbackKind, title: string, message: string, options: FeedbackOptions): Promise<string> {
    // Un chargement resté ouvert masquerait la fenêtre : on le ferme d'abord.
    await this.dismissAllLoadings();
    const modal = await this.modalCtrl.create({
      component: ElykFeedbackModalComponent,
      componentProps: {
        kind,
        title,
        message,
        details: options.details ?? [],
        actions: options.actions ?? [{ role: 'ok', text: 'OK', primary: true }]
      },
      cssClass: 'elyk-feedback-modal',
      backdropDismiss: kind !== 'error' || !options.actions,
      showBackdrop: true
    });
    await modal.present();
    const { role } = await modal.onDidDismiss<string>();
    return role ?? 'backdrop';
  }

  private async dismissAllLoadings(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const top = await this.loadingCtrl.getTop();
      if (!top) {
        return;
      }
      try {
        await top.dismiss();
      } catch {
        return;
      }
    }
  }
}
