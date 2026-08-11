import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { OnlineWriteError, WriteErrorKind } from './online-first-write.types';

@Injectable({
  providedIn: 'root'
})
export class HybridSyncUiService {
  constructor(private readonly alertController: AlertController) {}

  isOnlineWriteBusinessError(error: unknown): error is OnlineWriteError {
    return error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS;
  }

  async promptOfflineFallback(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.alertController.create({
        header: 'Enregistrement serveur impossible',
        message,
        buttons: [
          {
            text: 'Corriger',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Enregistrer hors ligne',
            handler: () => resolve(true)
          }
        ]
      }).then((alert) => alert.present());
    });
  }
}
