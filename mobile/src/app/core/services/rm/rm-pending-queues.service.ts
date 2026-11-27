import { Injectable, Optional } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmSocietyShareQueueService } from './rm-society-share-queue.service';

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
    private readonly assignQueue: RmCollectorAssignQueueService,
    @Optional() private readonly societyShareQueue?: RmSocietyShareQueueService
  ) {}

  /** Nombre d'opérations en attente, mis à jour en continu (badge). */
  readonly pendingCount$: Observable<number> = combineLatest([
    this.closeQueue.ops$,
    this.contactQueue.ops$,
    this.fieldControlQueue.ops$,
    this.tontineFieldControlQueue.ops$,
    this.carnetQueue.ops$,
    this.creditCarnetQueue.ops$,
    this.assignQueue.ops$,
    this.societyShareQueue ? this.societyShareQueue.ops$ : of([]),
  ]).pipe(
    map(lists => lists.reduce((total, ops) => total + ops.filter(op => !op.isSync).length, 0))
  );

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
      this.societyShareQueue ? this.societyShareQueue.listPending() : Promise.resolve([]),
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
