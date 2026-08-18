import { expect } from '@playwright/test';
import { LIVE_ACCOUNTS } from './accounts';

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';
const COMMERCIAL = LIVE_ACCOUNTS.commercial.username;

interface JsonEnvelope {
  data?: unknown;
  message?: string;
  statusCode?: number;
}

interface TontineMemberRow {
  id?: number;
  deliveryStatus?: string;
  client?: { id?: number; tontineCollector?: string; collector?: string };
}

interface ClientRow {
  id?: number;
  collector?: string;
  tontineCollector?: string;
}

async function signIn(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  expect(response.ok, `signin ${username} HTTP ${response.status}`).toBe(true);
  const body = (await response.json()) as { accessToken?: string; token?: string; data?: { token?: string } };
  const token = body.accessToken ?? body.token ?? body.data?.token;
  expect(token, `token JWT ${username}`).toBeTruthy();
  return token as string;
}

async function api(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: JsonEnvelope }> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as JsonEnvelope;
  return { status: response.status, json };
}

function pageContent<T>(json: JsonEnvelope): T[] {
  const data = json.data as { content?: T[] } | T[] | undefined;
  if (Array.isArray(data)) {
    return data;
  }
  return data?.content ?? [];
}

async function listInProgressMembers(token: string): Promise<TontineMemberRow[]> {
  const { status, json } = await api(
    token,
    'GET',
    `/api/v1/tontines/members?commercial=${encodeURIComponent(COMMERCIAL)}&deliveryStatus=SESSION_INPROGRESS&page=0&size=50`,
  );
  expect(status, `GET members COM020 HTTP ${status} ${JSON.stringify(json)}`).toBe(200);
  return pageContent<TontineMemberRow>(json);
}

async function listCommercialClients(token: string): Promise<ClientRow[]> {
  const byCommercial = await api(
    token,
    'GET',
    `/api/v1/clients/by-commercial/${encodeURIComponent(COMMERCIAL)}?page=0&size=50&sort=id,desc`,
  );
  if (byCommercial.status >= 200 && byCommercial.status < 300) {
    const rows = pageContent<ClientRow>(byCommercial.json);
    if (rows.length) {
      return rows;
    }
  }
  const fallback = await api(
    token,
    'GET',
    `/api/v1/clients?username=${encodeURIComponent(COMMERCIAL)}&page=0&size=50&sort=id,desc`,
  );
  expect(
    fallback.status,
    `GET clients COM020 HTTP ${fallback.status} ${JSON.stringify(fallback.json)}`,
  ).toBe(200);
  return pageContent<ClientRow>(fallback.json);
}

async function createCommercialClient(token: string): Promise<number> {
  const stamp = Date.now().toString().slice(-8);
  const payload = {
    id: null,
    firstname: 'E2E',
    lastname: `RmTontine${stamp}`,
    phone: `90${stamp.slice(-6)}`,
    cardType: 'CNI',
    cardID: `E2ERM${stamp}`,
    dateOfBirth: '1990-01-15',
    occupation: 'COMMERCANT',
    address: 'E2E RM tontine',
    quarter: 'E2E-QUARTIER',
    collector: COMMERCIAL,
    tontineCollector: COMMERCIAL,
    clientType: 'CLIENT',
    latitude: 6.137,
    longitude: 1.212,
    profilPhoto: 'e2e-photo',
  };
  const { status, json } = await api(token, 'POST', '/api/v1/clients', payload);
  expect(status, `POST client COM020 HTTP ${status} ${JSON.stringify(json)}`).toBeGreaterThanOrEqual(200);
  expect(status, `POST client COM020 HTTP ${status} ${JSON.stringify(json)}`).toBeLessThan(300);
  const created = json.data as { id?: number } | undefined;
  const id = created?.id;
  expect(id, `client créé sans id: ${JSON.stringify(json)}`).toBeTruthy();
  return id as number;
}

async function assignTontineCollector(gesToken: string, clientId: number): Promise<void> {
  const { status, json } = await api(gesToken, 'POST', '/api/v1/clients/bulk-assign-collectors', {
    clientIds: [clientId],
    tontineCollector: COMMERCIAL,
    transferInProgressCredits: false,
  });
  if (status === 400 && /déjà assignés/i.test(String(json.message ?? ''))) {
    return;
  }
  expect(status, `bulk-assign tontineCollector HTTP ${status} ${JSON.stringify(json)}`).toBe(200);
}

async function enrollMember(gesToken: string, clientId: number): Promise<number | null> {
  const { status, json } = await api(gesToken, 'POST', '/api/v1/tontines/members', {
    clientId,
    amount: 1000,
    frequency: 'DAILY',
  });
  if (status >= 200 && status < 300) {
    const created = json.data as { id?: number } | undefined;
    return created?.id ?? null;
  }
  const message = `${json.message ?? ''} ${JSON.stringify(json)}`;
  if (/déjà enregistré/i.test(message)) {
    return null;
  }
  throw new Error(`POST tontine member HTTP ${status}: ${message}`);
}

/**
 * Given : un membre tontine SESSION_INPROGRESS année en cours, collector tontine COM020,
 * pour que le pack RM `includeTontine=true` contienne au moins une fiche carnet.
 */
export async function ensureCom020InProgressTontineMember(): Promise<{ memberId: number; clientId: number }> {
  const gesToken = await signIn(LIVE_ACCOUNTS.gestionnaire.username, LIVE_ACCOUNTS.gestionnaire.password);
  await api(gesToken, 'POST', '/api/v1/tontines/sessions/current/reopen', {});

  const existing = await listInProgressMembers(gesToken);
  if (existing[0]?.id && existing[0].client?.id) {
    return { memberId: existing[0].id, clientId: existing[0].client.id };
  }

  const commercialToken = await signIn(LIVE_ACCOUNTS.commercial.username, LIVE_ACCOUNTS.commercial.password);
  let clients = await listCommercialClients(commercialToken);
  if (!clients.length) {
    const createdId = await createCommercialClient(commercialToken);
    clients = [{ id: createdId, collector: COMMERCIAL, tontineCollector: COMMERCIAL }];
  }

  const clientId = clients[0]?.id;
  expect(clientId, 'aucun client COM020 pour enrôler en tontine').toBeTruthy();
  await assignTontineCollector(gesToken, clientId as number);
  const enrolledId = await enrollMember(gesToken, clientId as number);

  const after = await listInProgressMembers(gesToken);
  const found = after.find((row) => row.client?.id === clientId) ?? after[0];
  if (found?.id && found.client?.id) {
    return { memberId: found.id, clientId: found.client.id };
  }

  if (enrolledId) {
    return { memberId: enrolledId, clientId: clientId as number };
  }

  const freshId = await createCommercialClient(commercialToken);
  await assignTontineCollector(gesToken, freshId);
  const freshMember = await enrollMember(gesToken, freshId);
  const retry = await listInProgressMembers(gesToken);
  const retryFound = retry.find((row) => row.client?.id === freshId) ?? retry[0];
  expect(
    retryFound?.id && retryFound.client?.id,
    `Arrange tontine COM020 échoué (enroll=${freshMember}, members=${JSON.stringify(retry)})`,
  ).toBeTruthy();
  return { memberId: retryFound!.id!, clientId: retryFound!.client!.id! };
}
