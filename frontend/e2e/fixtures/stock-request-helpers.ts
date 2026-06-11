import { expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { resolveCredentials, TEST_COMMERCIAL_USERNAME } from './test-data';

type StockRequestStatus = 'CREATED' | 'VALIDATED' | 'DELIVERED';

async function pollStockRequestStatus(
  reference: string,
  expected: StockRequestStatus,
  userKey: 'gestionnaire' | 'magasinier',
): Promise<void> {
  await expect.poll(async () => {
    const api = new ApiClient();
    const { username, password } = await resolveCredentials(userKey);
    await api.signIn(username, password);
    return api.getStockRequestStatus(reference, TEST_COMMERCIAL_USERNAME);
  }, { timeout: 20_000 }).toBe(expected);
}

/** Attend que le backend confirme la validation par le gestionnaire. */
export async function expectStockRequestValidated(reference: string): Promise<void> {
  await pollStockRequestStatus(reference, 'VALIDATED', 'gestionnaire');
}

/** Attend que le backend confirme la livraison par le magasinier. */
export async function expectStockRequestDelivered(reference: string): Promise<void> {
  await pollStockRequestStatus(reference, 'DELIVERED', 'magasinier');
}
