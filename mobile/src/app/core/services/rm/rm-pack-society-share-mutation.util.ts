import { RmOfflinePack, RmPackTontineMember } from './rm.models';
import { RmScopeService } from './rm-scope.service';
import { RmSocietyShareResult } from './rm-society-share.models';

/**
 * Reporte sur le membre du pack la part société validée ou corrigée par le chef de recouvrement.
 * Hors ligne, le résultat est déduit de la saisie : égal = validée, différent = corrigée.
 */
export async function mutatePackSocietyShare(
  scope: RmScopeService,
  memberId: number,
  result: RmSocietyShareResult
): Promise<void> {
  const pack = scope.getPack();
  const list = pack?.tontineMembers as RmPackTontineMember[] | undefined;
  if (!pack || !list || result.outcome === 'REJECTED') {
    return;
  }
  const nextList = list.map(member =>
    member.id === memberId
      ? {
          ...member,
          societyShare: result.memberSocietyShare ?? member.societyShare,
          societyShareStatus: result.memberSocietyShareStatus ?? member.societyShareStatus,
          societyShareLocked: result.memberSocietyShareLocked ?? true
        }
      : member
  );
  const nextPack: RmOfflinePack = { ...pack, tontineMembers: nextList };
  await scope.setPack(nextPack);
}

/** Résultat attendu d'une saisie faite hors ligne (le serveur le confirmera à l'envoi). */
export function offlineSocietyShareResult(current: number | undefined, declared: number): RmSocietyShareResult {
  const same = current !== undefined && Math.abs(declared - current) < 1;
  return {
    outcome: same ? 'VALIDATED' : 'ADJUSTED',
    memberSocietyShare: same ? current : declared,
    memberSocietyShareStatus: same ? 'CONFIRMED' : 'ADJUSTED',
    memberSocietyShareLocked: true
  };
}
