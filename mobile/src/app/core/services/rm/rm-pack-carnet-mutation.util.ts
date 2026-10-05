import { RmOfflinePack } from './rm.models';
import { RmScopeService } from './rm-scope.service';

type PackListKey = 'lateCredits' | 'tontineMembers';

interface PackCarnetItem {
  id: number;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
}

/**
 * Updates carnet verification fields on one pack list item and persists the pack.
 */
export async function mutatePackCarnetFlag(
  scope: RmScopeService,
  listKey: PackListKey,
  entityId: number,
  verified: boolean,
  at?: string,
  by?: string
): Promise<void> {
  const pack = scope.getPack();
  const list = pack?.[listKey] as PackCarnetItem[] | undefined;
  if (!pack || !list) {
    return;
  }
  const nextList = list.map(item =>
    item.id === entityId
      ? {
          ...item,
          carnetVerified: verified,
          carnetVerifiedAt: verified ? at : undefined,
          carnetVerifiedBy: verified ? by : undefined
        }
      : item
  );
  const nextPack: RmOfflinePack = { ...pack, [listKey]: nextList };
  await scope.setPack(nextPack);
}
