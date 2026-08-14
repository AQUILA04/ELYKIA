import { TontineCollection, TontineMember } from '../../models/tontine.model';

export type SocietyShareVersion = 'V1' | 'V2';

export function toDateOnlyString(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const ymd = String(value).substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : undefined;
}

export function toContributionMonth(value?: string | null, fallbackDate?: string | null): string | undefined {
  const source = toDateOnlyString(value) || toDateOnlyString(fallbackDate);
  if (!source) {
    return undefined;
  }
  return `${source.substring(0, 7)}-01`;
}

export function toSqliteBool(value: boolean | number | undefined | null): number {
  return value === true || value === 1 ? 1 : 0;
}

export function fromSqliteBool(value: boolean | number | undefined | null): boolean {
  return value === true || value === 1;
}

export function mapApiMemberToLocal(
  member: any,
  sessionId: string,
  commercialUsername: string | undefined,
  localUnsyncedTotal = 0
): TontineMember {
  const serverTotal = member.totalContribution || 0;
  return {
    id: String(member.id),
    tontineSessionId: sessionId,
    clientId: member.client?.id != null ? String(member.client.id) : member.clientId,
    commercialUsername: commercialUsername || member.commercialUsername,
    totalContribution: serverTotal + localUnsyncedTotal,
    deliveryStatus: member.deliveryStatus,
    registrationDate: member.registrationDate,
    frequency: member.frequency,
    amount: member.amount,
    notes: member.notes,
    isLocal: false,
    isSync: true,
    operationConsentCode: member.operationConsentCode,
    societyShare: member.societyShare ?? 0,
    availableContribution: member.availableContribution ?? Math.max(0, serverTotal - (member.societyShare ?? 0)),
    validatedMonths: member.validatedMonths ?? 0,
    currentMonthDays: member.currentMonthDays ?? 0
  };
}

export function mapApiCollectionToLocal(
  collection: any,
  commercialUsername: string | undefined,
  memberIdFallback?: string
): TontineCollection {
  const collectionDate = collection.collectionDate;
  return {
    id: String(collection.id),
    tontineMemberId: String(
      collection.tontineMemberId || collection.tontineMember?.id || collection.member?.id || memberIdFallback || ''
    ),
    amount: collection.amount,
    collectionDate,
    commercialUsername: collection.commercialUsername || commercialUsername,
    isLocal: false,
    isSync: true,
    isDeliveryCollection: collection.isDeliveryCollection === true,
    notes: collection.notes,
    operationConsentCode: collection.operationConsentCode,
    confirmedAmount: collection.confirmedAmount,
    societyShareAmount: collection.societyShareAmount ?? 0,
    contributionMonth: toContributionMonth(collection.contributionMonth, collectionDate),
    advanceToNextMonth: collection.advanceToNextMonth === true
  };
}

export function shouldSkipPulledCollection(
  collection: any,
  unsyncedLocalIds: Set<string>
): boolean {
  const reference = collection?.reference != null ? String(collection.reference) : '';
  const id = collection?.id != null ? String(collection.id) : '';
  return (reference !== '' && unsyncedLocalIds.has(reference)) || (id !== '' && unsyncedLocalIds.has(id));
}

export function mapCollectionRow(row: any): TontineCollection {
  return {
    ...row,
    isLocal: fromSqliteBool(row.isLocal),
    isSync: fromSqliteBool(row.isSync),
    isDeliveryCollection: fromSqliteBool(row.isDeliveryCollection),
    advanceToNextMonth: fromSqliteBool(row.advanceToNextMonth),
    societyShareAmount: row.societyShareAmount ?? 0
  };
}
