import { expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { TEST_COMMERCIAL_USERNAME } from './test-data';

export async function expectStockReturnReceived(returnId: number): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    return api.getStockReturnStatus(returnId);
  }, { timeout: 30_000 }).toBe('RECEIVED');
}

export async function findCreatedStockReturnId(collector: string): Promise<number> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  let foundId: number | null = null;
  await expect.poll(async () => {
    const returns = await api.getStockReturns(collector);
    const created = returns.find((row) => row.status === 'CREATED');
    foundId = created?.id ?? null;
    return foundId;
  }, { timeout: 30_000 }).not.toBeNull();

  return foundId!;
}
