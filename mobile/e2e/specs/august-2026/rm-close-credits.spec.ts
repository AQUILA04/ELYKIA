import { test, expect } from '@playwright/test';
import { LIVE_ACCOUNTS } from '../../fixtures/accounts';

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';
const COMMERCIAL = process.env['E2E_COMMERCIAL_USERNAME'] ?? 'COM020';

async function signIn(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Sign-in failed for ${username}: HTTP ${response.status}`);
  }
  const body = await response.json();
  const token = body.accessToken ?? body.token ?? body.data?.token;
  if (!token) {
    throw new Error(`No token for ${username}`);
  }
  return token;
}

test.describe('Clôture RM idempotente @p0 @mobile @rm @august-2026 @regression', () => {
  test('RM-P0-05 close-credits : même reference = un seul encaissement', async () => {
    const token = await signIn(
      LIVE_ACCOUNTS.recoveryManager.username,
      LIVE_ACCOUNTS.recoveryManager.password,
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const lateResponse = await fetch(
      `${API_URL}/api/v1/credits/late?collector=${encodeURIComponent(COMMERCIAL)}`,
      { headers },
    );
    expect(lateResponse.ok, `late HTTP ${lateResponse.status}`).toBe(true);
    const lateBody = await lateResponse.json();
    const lateCredits = (lateBody.data ?? lateBody) as Array<{
      id: number;
      totalAmountRemaining?: number;
    }>;
    const target = Array.isArray(lateCredits)
      ? lateCredits.find((credit) => (credit.totalAmountRemaining ?? 0) >= 100)
      : undefined;
    test.skip(!target, `Aucun retard ${COMMERCIAL} avec restant >= 100`);
    if (!target) {
      return;
    }

    const reference = `RMO-E2E-${Date.now()}`.slice(0, 64);
    const payload = {
      items: [{ creditId: target.id, amount: 50, isPartial: true, reference }],
    };

    const firstResponse = await fetch(`${API_URL}/api/v1/recovery-manager/close-credits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const firstBody = await firstResponse.json();
    expect(firstResponse.ok, JSON.stringify(firstBody)).toBe(true);

    const secondResponse = await fetch(`${API_URL}/api/v1/recovery-manager/close-credits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const secondBody = await secondResponse.json();
    expect(secondResponse.ok, JSON.stringify(secondBody)).toBe(true);

    const firstData = firstBody.data ?? firstBody;
    const secondData = secondBody.data ?? secondBody;
    expect(firstData.successes?.length, JSON.stringify(firstBody)).toBe(1);
    expect(firstData.failures ?? []).toHaveLength(0);
    expect(secondData.successes?.length, JSON.stringify(secondBody)).toBe(1);
    expect(secondData.failures ?? []).toHaveLength(0);
  });
});
