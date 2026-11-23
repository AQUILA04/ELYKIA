import { Injectable } from '@angular/core';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';

/**
 * Vue unique sur les files hors ligne du chef de recouvrement (isSync=false).
 * Sert de garde-fou : déconnexion, 401, quitter l'application.
 */
@Injectable({ providedIn: 'root' })
export class RmPendingQueuesService {
  constructor(
    private readonly closeQueue: RmCloseQueueService,
    private readonly contactQueue: RmContactQueueService,
    private readonly fieldControlQueue: RmFieldControlQueueService,
    private readonly tontineFieldControlQueue: RmTontineFieldControlQueueService,
    private readonly carnetQueue: RmCarnetVerificationQueueService,
    private readonly creditCarnetQueue: RmCreditCarnetVerificationQueueService,
    private readonly assignQueue: RmCollectorAssignQueueService
  ) {}

  /** Nombre total d'opérations non synchronisées. Lève si une file est illisible. */
  async pendingCount(): Promise<number> {
    const lists = await Promise.all([
      this.closeQueue.listPending(),
      this.contactQueue.listPending(),
      this.fieldControlQueue.listPending(),
      this.tontineFieldControlQueue.listPending(),
      this.carnetQueue.listPending(),
      this.creditCarnetQueue.listPending(),
      this.assignQueue.listPending(),
    ]);
    return lists.reduce((total, list) => total + list.length, 0);
  }

  /**
   * Vrai s'il reste des opérations en attente. En cas d'erreur de lecture,
   * on suppose qu'il en reste (mieux vaut bloquer une purge que perdre une saisie).
   */
  async hasPending(): Promise<boolean> {
    try {
      return (await this.pendingCount()) > 0;
    } catch (error) {
      console.error('[RmPendingQueues] lecture des files impossible, on suppose des données en attente', error);
      return true;
    }
  }
}
