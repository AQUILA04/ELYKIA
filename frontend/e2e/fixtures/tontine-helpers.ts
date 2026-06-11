import { expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { todayIsoDate } from './test-data';

export async function expectTontineMemberExists(clientLastName: string): Promise<number> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  let memberId: number | null = null;
  await expect.poll(async () => {
    const member = await api.findTontineMemberByClientLastName(clientLastName);
    memberId = member?.id ?? null;
    return memberId;
  }, { timeout: 30_000 }).not.toBeNull();

  return memberId!;
}

export async function expectTontineMemberDeliveryStatus(
  clientLastName: string,
  status: string,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    const member = await api.findTontineMemberByClientLastName(clientLastName);
    return member?.deliveryStatus ?? '';
  }, { timeout: 30_000 }).toBe(status);
}

export async function expectTontineCollectionSummary(
  collector: string,
  minAmount: number,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const today = todayIsoDate();

  await expect.poll(async () => {
    const summary = await api.getTontineCollectionSummary(today, today, collector);
    return summary.totalMontant ?? 0;
  }, { timeout: 30_000 }).toBeGreaterThanOrEqual(minAmount);
}
