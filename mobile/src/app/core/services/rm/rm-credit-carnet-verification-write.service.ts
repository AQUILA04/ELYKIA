import { Injectable } from '@angular/core';
import { createRmLocalOpId } from '../../utils/rm-local-op-id.util';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import {
  executeCarnetBulkSet,
  executeCarnetSetVerified,
  RmCarnetVerificationWritePorts
} from './rm-carnet-verification-write.helper';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import { RmScopeService } from './rm-scope.service';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';
import { RmCreditLate, RmOfflinePack } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly scope: RmScopeService
  ) {}

  async setVerified(credit: RmCreditLate, verified: boolean): Promise<RmCreditCarnetVerificationOp> {
    return executeCarnetSetVerified(this.ports(), credit, verified);
  }

  async bulkSet(credits: RmCreditLate[], verified: boolean): Promise<void> {
    await executeCarnetBulkSet(this.ports(), credits, verified);
  }

  private ports(): RmCarnetVerificationWritePorts<
    RmCreditLate,
    RmCreditCarnetVerificationOp,
    Awaited<ReturnType<RmCreditCarnetVerificationApiService['setVerified']>>
  > {
    return {
      coordinator: this.coordinator,
      entityLabel: id => `RmCreditCarnetVerification:${id}`,
      bulkLabel: count => `RmCreditCarnetVerificationBulk:${count}`,
      entityId: credit => credit.id,
      buildOp: (credit, verified) => this.buildOp(credit, verified),
      setVerifiedApi: (id, verified) => this.api.setVerified(id, verified),
      bulkSetApi: (ids, verified) => this.api.bulkSet(ids, verified),
      upsert: op => this.queue.upsert(op),
      applyPackMutation: (id, verified, at, by) => this.applyPackMutation(id, verified, at, by)
    };
  }

  private buildOp(credit: RmCreditLate, verified: boolean): RmCreditCarnetVerificationOp {
    return {
      localId: createRmLocalOpId('ccv', credit.id),
      creditId: credit.id,
      clientName: credit.clientName,
      reference: credit.reference,
      verified,
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private async applyPackMutation(
    creditId: number,
    verified: boolean,
    at?: string,
    by?: string
  ): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack?.lateCredits) {
      return;
    }
    const nextLates = pack.lateCredits.map(item =>
      item.id === creditId
        ? {
            ...item,
            carnetVerified: verified,
            carnetVerifiedAt: verified ? at : undefined,
            carnetVerifiedBy: verified ? by : undefined
          }
        : item
    );
    const nextPack: RmOfflinePack = { ...pack, lateCredits: nextLates };
    await this.scope.setPack(nextPack);
  }
}
