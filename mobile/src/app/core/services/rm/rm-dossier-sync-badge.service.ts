import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { RmScopeService } from './rm-scope.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import {
  buildRmSyncIndex,
  emptyRmSyncIndex,
  isClientLocal,
  isCreditLocal,
  isTontineLocal,
  RmSyncIndex
} from './rm-dossier-sync.util';

@Injectable({ providedIn: 'root' })
export class RmDossierSyncBadgeService {
  private index: RmSyncIndex = emptyRmSyncIndex();
  readonly changes$: Observable<RmSyncIndex>;

  constructor(
    private readonly scope: RmScopeService,
    closeQueue: RmCloseQueueService,
    contactQueue: RmContactQueueService,
    fieldControlQueue: RmFieldControlQueueService,
    tontineFieldControlQueue: RmTontineFieldControlQueueService,
    carnetQueue: RmCarnetVerificationQueueService,
    creditCarnetQueue: RmCreditCarnetVerificationQueueService,
    assignQueue: RmCollectorAssignQueueService
  ) {
    this.changes$ = combineLatest([
      closeQueue.ops$,
      fieldControlQueue.ops$,
      creditCarnetQueue.ops$,
      tontineFieldControlQueue.ops$,
      carnetQueue.ops$,
      contactQueue.patches$,
      assignQueue.ops$
    ]).pipe(
      map(([closes, creditControls, creditCarnets, tontineControls, tontineCarnets, contacts, assigns]) =>
        buildRmSyncIndex({
          closes,
          creditControls,
          creditCarnets,
          tontineControls,
          tontineCarnets,
          contacts,
          assigns
        })
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.changes$.subscribe(index => {
      this.index = index;
    });
  }

  isCreditLocal(creditId: number, clientId?: number | null): boolean {
    return isCreditLocal(this.index, creditId, clientId);
  }

  isTontineLocal(memberId: number, clientId?: number | null): boolean {
    return isTontineLocal(this.index, memberId, clientId);
  }

  isClientLocal(clientId: number): boolean {
    const pack = this.scope.getPack();
    const creditIds = [...(pack?.lateCredits ?? []), ...(pack?.inProgressCredits ?? [])]
      .filter(credit => credit.clientId === clientId)
      .map(credit => credit.id);
    const memberIds = (pack?.tontineMembers ?? [])
      .filter(member => member.clientId === clientId)
      .map(member => member.id);
    return isClientLocal(this.index, clientId, { creditIds, memberIds });
  }
}
