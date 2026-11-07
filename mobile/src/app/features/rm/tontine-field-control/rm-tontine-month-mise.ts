import { RmPackTontineMember, RmPackTontineMonth } from '../../../core/services/rm/rm.models';

/**
 * Mise du mois. Un pack ancien, sans dailyAmount, retombe sur la mise actuelle du membre.
 * Une mise explicite à 0 reste à 0 : le mois se saisit alors à la main.
 */
export function resolveMonthMise(
  dailyAmount: number | null | undefined,
  currentAmount: number | null | undefined
): number {
  if (dailyAmount != null && Number.isFinite(Number(dailyAmount))) {
    const value = Number(dailyAmount);
    return value > 0 ? value : 0;
  }
  const current = Number(currentAmount);
  return Number.isFinite(current) && current > 0 ? current : 0;
}

/** Vrai lorsqu'un mois déjà présent n'a pas encore de mise historique. */
export function memberLacksDailyAmount(member: RmPackTontineMember | null | undefined): boolean {
  const months: RmPackTontineMonth[] = [...(member?.months || [])];
  for (const collector of member?.collectors || []) {
    months.push(...(collector.months || []));
  }
  if (!months.length) {
    return false;
  }
  return months.some(month => month.dailyAmount == null || !Number.isFinite(Number(month.dailyAmount)));
}
