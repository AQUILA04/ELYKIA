import { expect } from '@playwright/test';
import { ApiClient, CreditSummary, MonthlyStockItem } from './api-client';
import { TEST_COMMERCIAL_USERNAME, todayIsoDate } from './test-data';

export async function expectCreditForClient(
  clientLastName: string,
  options?: { status?: string; timeoutMs?: number },
): Promise<CreditSummary> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const timeoutMs = options?.timeoutMs ?? 30_000;

  let found: CreditSummary | null = null;
  await expect.poll(async () => {
    found = await api.findCreditByClientLastName(TEST_COMMERCIAL_USERNAME, clientLastName);
    if (!found) {
      return null;
    }
    if (options?.status && found.status !== options.status) {
      return null;
    }
    return found;
  }, { timeout: timeoutMs }).not.toBeNull();

  return found!;
}

export async function expectRecouvrementForCredit(
  creditReference: string,
  minAmount = 1,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const today = todayIsoDate();

  await expect.poll(async () => {
    const rows = await api.getRecouvrements(today, today, TEST_COMMERCIAL_USERNAME);
    return rows.some(
      (row) => row.creditReference === creditReference && row.amount >= minAmount,
    );
  }, { timeout: 30_000 }).toBe(true);
}

export async function getMonthlyStockItem(
  collector: string,
  articleId: number,
): Promise<MonthlyStockItem | null> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const stock = await api.getCurrentMonthlyStock(collector);
  return (
    stock?.items?.find(
      (item) => (item.article?.id ?? item.articleId) === articleId,
    ) ?? null
  );
}
