import { expect } from '@playwright/test';
import { LIVE_ACCOUNTS } from './accounts';

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';

interface CollectionRow {
  amount?: number;
  reference?: string;
  commercialUsername?: string;
}

function extractContent(body: unknown): CollectionRow[] {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const root = body as { data?: { content?: CollectionRow[] }; content?: CollectionRow[] };
  return root.data?.content ?? root.content ?? [];
}

export async function assertTontineCollectionOnBackend(amount: number): Promise<void> {
  const signIn = await fetch(`${API_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: LIVE_ACCOUNTS.commercial.username,
      password: LIVE_ACCOUNTS.commercial.password,
    }),
  });
  expect(signIn.ok, `signin COM020 HTTP ${signIn.status}`).toBe(true);
  const authBody = (await signIn.json()) as { accessToken?: string; token?: string; data?: { token?: string } };
  const token = authBody.accessToken ?? authBody.token ?? authBody.data?.token;
  expect(token, 'token JWT COM020').toBeTruthy();

  const list = await fetch(`${API_URL}/api/v1/tontines/collections?size=50&sort=id,desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(list.ok, `GET collections HTTP ${list.status}`).toBe(true);
  const rows = extractContent(await list.json());
  expect(
    rows.some((row) => Number(row.amount) === amount),
    `aucune collecte backend de ${amount} FCFA pour ${LIVE_ACCOUNTS.commercial.username} (reçues=${rows
      .map((row) => row.amount)
      .join(',')})`,
  ).toBe(true);
}
