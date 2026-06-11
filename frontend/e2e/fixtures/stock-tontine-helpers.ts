import { expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { TEST_COMMERCIAL_USERNAME } from './test-data';

export async function expectStockTontineRequestValidated(reference: string): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    return api.getStockTontineRequestStatus(reference, TEST_COMMERCIAL_USERNAME);
  }, { timeout: 30_000 }).toBe('VALIDATED');
}

export async function expectStockTontineRequestDelivered(reference: string): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    return api.getStockTontineRequestStatus(reference, TEST_COMMERCIAL_USERNAME);
  }, { timeout: 30_000 }).toBe('DELIVERED');
}

export async function expectTontineStockAvailable(
  articleId: number,
  minQuantity: number,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    const stock = await api.getTontineStockForArticle(TEST_COMMERCIAL_USERNAME, articleId);
    return stock?.availableQuantity ?? 0;
  }, { timeout: 30_000 }).toBeGreaterThanOrEqual(minQuantity);
}
