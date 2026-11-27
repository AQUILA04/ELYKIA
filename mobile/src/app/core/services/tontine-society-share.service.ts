import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { TontineCollection, TontineMember, TontineSession } from '../../models/tontine.model';
import { DatabaseService } from './database.service';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';
import { TontineCalculationService } from './tontine-calculation.service';
import { TontineMemberRepository } from '../repositories/tontine-member.repository';
import { TontineCollectionRepository } from '../repositories/tontine-collection.repository';
import { LoggerService } from './logger.service';

export type TontineSocietyShareSource = 'MOBILE_MEMBER' | 'DELIVERY_CREATION' | 'RM_CONTROL';
export type TontineSocietyShareOutcome = 'ADJUSTED' | 'VALIDATED' | 'REJECTED' | 'RESET';

/** Réponse du serveur à une saisie de part société (champs utiles au téléphone). */
export interface TontineSocietyShareAdjustmentResponse {
  outcome: TontineSocietyShareOutcome;
  reference?: string | null;
  message?: string;
  memberSocietyShare?: number;
  memberAvailableContribution?: number;
  memberSocietyShareStatus?: 'AUTO' | 'CONFIRMED' | 'ADJUSTED';
  memberSocietyShareLocked?: boolean;
}

/** Saisie faite hors ligne, envoyée à la prochaine synchronisation. */
export interface TontineSocietySharePending {
  tontineMemberId: string;
  declaredSocietyShare: number;
  reference: string;
  comment?: string | null;
  createdAt: string;
  lastError?: string | null;
}

export interface TontineSocietyShareSaveResult {
  offline: boolean;
  message: string;
  availableContribution: number;
}

export function newSocietyShareReference(prefix = 'SSA-MOB'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

/**
 * Part société réelle de l'année saisie par le commercial (fiche membre).
 * En ligne : le serveur valide (montant égal) ou remplace la part, et renvoie le nouveau solde.
 * Hors ligne : la saisie est gardée dans `tontine_society_share_pending` et appliquée au calcul local
 * jusqu'à son envoi ; le serveur garde le dernier mot (chef de recouvrement prioritaire).
 */
@Injectable({ providedIn: 'root' })
export class TontineSocietyShareService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontines/members`;

  constructor(
    private readonly http: HttpClient,
    private readonly db: DatabaseService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly calculation: TontineCalculationService,
    private readonly memberRepo: TontineMemberRepository,
    private readonly collectionRepo: TontineCollectionRepository,
    private readonly log: LoggerService
  ) {}

  /** Le membre avec la part saisie en attente (hors ligne) appliquée au calcul local. */
  async withPendingOverride(member: TontineMember): Promise<TontineMember> {
    const pending = await this.getPending(member.id);
    if (!pending) {
      return member;
    }
    return { ...member, societyShareOverride: pending.declaredSocietyShare };
  }

  async adjust(
    member: TontineMember,
    session: TontineSession | null | undefined,
    declaredSocietyShare: number,
    comment?: string | null
  ): Promise<TontineSocietyShareSaveResult> {
    const declared = Math.round(declaredSocietyShare);
    const reference = newSocietyShareReference();
    const result = await this.coordinator.executeWrite<TontineSocietyShareSaveResult>({
      entityLabel: `tontine-society-share:${member.id}`,
      saveOnline: async () => {
        const serverId = await this.serverMemberId(member.id);
        if (!serverId) {
          throw new Error('Membre non synchronisé');
        }
        const response = await this.post(serverId, {
          reference,
          declaredSocietyShare: declared,
          comment: comment || null,
          source: 'MOBILE_MEMBER'
        });
        await this.applyServerResponse(member.id, response);
        await this.deletePending(member.id);
        return {
          offline: false,
          message: response.message || 'Part société enregistrée.',
          availableContribution: response.memberAvailableContribution ?? member.availableContribution ?? 0
        };
      },
      saveOffline: async () => {
        await this.upsertPending({
          tontineMemberId: member.id,
          declaredSocietyShare: declared,
          reference,
          comment: comment || null,
          createdAt: new Date().toISOString(),
          lastError: null
        });
        const available = await this.applyLocally({ ...member, societyShareOverride: declared }, session);
        return {
          offline: true,
          message: 'Part société enregistrée sur ce téléphone : elle sera envoyée à la prochaine synchronisation.',
          availableContribution: available
        };
      }
    });
    return result.data;
  }

  /**
   * Envoie les saisies en attente. Un refus métier (membre livré, part déjà validée par le chef de
   * recouvrement, montant hors plage) retire la saisie : le serveur garde la main.
   */
  async syncPending(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const pending = await this.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const op of pending) {
      try {
        const serverId = await this.serverMemberId(op.tontineMemberId);
        if (!serverId) {
          continue;
        }
        const response = await this.post(serverId, {
          reference: op.reference,
          declaredSocietyShare: op.declaredSocietyShare,
          comment: op.comment || null,
          source: 'MOBILE_MEMBER'
        });
        await this.applyServerResponse(op.tontineMemberId, response);
        await this.deletePending(op.tontineMemberId);
        synced++;
      } catch (error) {
        const message = this.coordinator.extractErrorMessage(error);
        if (this.coordinator.isBusinessError(error)) {
          await this.deletePending(op.tontineMemberId);
          await this.clearLocalOverride(op.tontineMemberId);
        } else {
          await this.db.execute(
            'UPDATE tontine_society_share_pending SET lastError = ? WHERE tontineMemberId = ?',
            [message, op.tontineMemberId]
          );
        }
        failed++;
        errors.push(`Part société ${op.tontineMemberId} : ${message}`);
        void this.log.log(`[TontineSocietyShare] envoi refusé pour ${op.tontineMemberId} : ${message}`);
      }
    }
    return { synced, failed, errors };
  }

  async getPending(memberId: string): Promise<TontineSocietySharePending | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM tontine_society_share_pending WHERE tontineMemberId = ?',
        [memberId]
      );
      return (result?.values?.[0] as TontineSocietySharePending) ?? null;
    } catch {
      return null;
    }
  }

  async listPending(): Promise<TontineSocietySharePending[]> {
    try {
      const result = await this.db.query('SELECT * FROM tontine_society_share_pending ORDER BY createdAt ASC');
      return (result?.values ?? []) as TontineSocietySharePending[];
    } catch {
      return [];
    }
  }

  /** Recalcule le solde du membre sur le téléphone avec la part saisie ; renvoie le nouveau solde disponible. */
  async applyLocally(member: TontineMember, session: TontineSession | null | undefined): Promise<number> {
    if (!session) {
      return member.availableContribution ?? 0;
    }
    const collections: TontineCollection[] = await this.collectionRepo.getByMemberId(member.id);
    const status = await this.calculation.calculateMemberStatus(member, session, collections);
    await this.memberRepo.updateDerivedAllocation(member.id, {
      totalContribution: status.totalCollected,
      societyShare: status.societyShare,
      availableContribution: status.availableBudget,
      validatedMonths: status.validatedMonths,
      currentMonthDays: status.currentMonthDays
    });
    await this.memberRepo.updateSocietyShareState(member.id, {
      societyShareOverride: member.societyShareOverride ?? null,
      societyShareStatus: member.societyShareOverride != null ? 'ADJUSTED' : (member.societyShareStatus ?? 'AUTO'),
      societyShareLocked: !!member.societyShareLocked
    });
    return status.availableBudget;
  }

  private async applyServerResponse(memberId: string, response: TontineSocietyShareAdjustmentResponse): Promise<void> {
    if (response.outcome === 'REJECTED') {
      return;
    }
    await this.memberRepo.updateSocietyShareFromServer(memberId, {
      societyShare: response.memberSocietyShare,
      availableContribution: response.memberAvailableContribution,
      societyShareStatus: response.memberSocietyShareStatus,
      societyShareLocked: response.memberSocietyShareLocked === true,
      societyShareOverride: response.memberSocietyShareStatus === 'ADJUSTED' ? response.memberSocietyShare ?? null : null
    });
  }

  private async clearLocalOverride(memberId: string): Promise<void> {
    await this.memberRepo.updateSocietyShareState(memberId, {
      societyShareOverride: null,
      societyShareStatus: 'AUTO',
      societyShareLocked: false
    });
  }

  private async post(
    serverMemberId: string,
    body: { reference: string; declaredSocietyShare: number; comment: string | null; source: TontineSocietyShareSource }
  ): Promise<TontineSocietyShareAdjustmentResponse> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<TontineSocietyShareAdjustmentResponse>>(
        `${this.baseUrl}/${serverMemberId}/society-share-adjustments`,
        body
      )
    );
    if (!response?.data) {
      throw new Error(response?.message || 'Réponse invalide du serveur pour la part société');
    }
    return response.data;
  }

  private async serverMemberId(memberId: string): Promise<string | null> {
    if (/^\d+$/.test(memberId)) {
      return memberId;
    }
    return this.memberRepo.getServerId(memberId, 'tontine-member');
  }

  private async upsertPending(op: TontineSocietySharePending): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO tontine_society_share_pending
         (tontineMemberId, declaredSocietyShare, reference, comment, createdAt, lastError)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [op.tontineMemberId, op.declaredSocietyShare, op.reference, op.comment ?? null, op.createdAt, op.lastError ?? null]
    );
  }

  private async deletePending(memberId: string): Promise<void> {
    await this.db.execute('DELETE FROM tontine_society_share_pending WHERE tontineMemberId = ?', [memberId]);
  }
}
