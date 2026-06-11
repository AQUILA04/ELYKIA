import { expect } from '@playwright/test';
import { ApiClient, CreditSummary } from './api-client';
import { TEST_COMMERCIAL_USERNAME } from './test-data';

export async function expectRattrapageCreditForClient(
  clientLastName: string,
  options?: { status?: string; timeoutMs?: number },
): Promise<CreditSummary> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const timeoutMs = options?.timeoutMs ?? 30_000;

  let found: CreditSummary | null = null;
  await expect.poll(async () => {
    found = await api.findRattrapageCreditByClientLastName(clientLastName);
    if (!found) {
      return null;
    }
    if (options?.status && found.status !== options.status) {
      return null;
    }
    if (!found.reference?.startsWith('RAT-')) {
      return null;
    }
    return found;
  }, { timeout: timeoutMs }).not.toBeNull();

  return found!;
}

export async function expectResidualStockRemaining(
  articleId: number,
  expectedRemaining: number,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();

  await expect.poll(async () => {
    const item = await api.getResidualStockItemRemaining(TEST_COMMERCIAL_USERNAME, articleId);
    return item?.quantityRemaining ?? -1;
  }, { timeout: 30_000 }).toBe(expectedRemaining);
}
