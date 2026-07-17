import { MockData } from './mock-data';

function pathnameOf(apiPath: string): string {
  return apiPath.split('?')[0] ?? apiPath;
}

function findMockKeyByPathPrefix(pathPrefix: string): string | undefined {
  return Object.keys(MockData).find((key) => pathnameOf(key) === pathPrefix || key.startsWith(pathPrefix));
}

function findAccountsMockKey(): string | undefined {
  return Object.keys(MockData).find((key) => key.startsWith('/api/v1/accounts/by-commercial'));
}

/**
 * Replays a paginated mock for any page/size query (e.g. client PAGE_SIZE=200 in the app).
 */
function adaptPagedResponse(mock: Record<string, unknown>, apiPath: string): Record<string, unknown> {
  const url = new URL(apiPath, 'http://localhost');
  const page = Number(url.searchParams.get('page') ?? '0');
  const size = Number(url.searchParams.get('size') ?? '20');
  const source = (mock['data'] as Record<string, unknown>) ?? mock;
  const allContent = (source['content'] as unknown[]) ?? [];
  const totalElements =
    ((source['page'] as Record<string, number> | undefined)?.totalElements as number | undefined) ??
    allContent.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const content = page === 0 ? allContent : [];

  return {
    ...mock,
    data: {
      content,
      page: {
        size,
        number: page,
        totalElements,
        totalPages: content.length > 0 ? Math.max(1, Math.ceil(totalElements / size)) : totalPages,
      },
    },
  };
}

function paginatedTotal(keyPrefix: string): number {
  const key = Object.keys(MockData).find((candidate) => candidate.startsWith(keyPrefix));
  if (!key) {
    return 0;
  }
  return (MockData[key]?.data?.page?.totalElements as number | undefined) ?? 0;
}

function buildDataSummary(commercial: string): Record<string, unknown> {
  const clientsKey = findMockKeyByPathPrefix(`/api/v1/clients/by-commercial/${commercial}`);
  const totalClients = clientsKey ? ((MockData[clientsKey]?.data?.page?.totalElements as number) ?? 0) : 0;

  const localitiesMock = MockData['/api/v1/localities/all'];
  const totalLocalities = Array.isArray(localitiesMock?.data) ? localitiesMock.data.length : 0;

  const recoveriesMock = MockData[`/api/v1/mobiles/credit-timelines/${commercial}`];
  const totalRecoveries = Array.isArray(recoveriesMock?.data) ? recoveriesMock.data.length : 0;

  return {
    status: 'OK',
    statusCode: 200,
    message: 'default.message.success',
    service: 'MOCK-SERVICE',
    data: {
      commercialUsername: commercial,
      generatedAt: '2026-07-17T00:00:00.000Z',
      totalClients,
      totalDistributions: paginatedTotal(`/api/v1/credits/by-commercial/${commercial}`),
      totalRecoveries,
      totalTontineMembers: 0,
      totalTontineCollections: 0,
      totalTontineDeliveries: 0,
      totalArticles: paginatedTotal('/api/v1/articles'),
      totalLocalities,
      totalStockOutputs: 0,
      totalAccounts: paginatedTotal('/api/v1/accounts/by-commercial'),
      totalTontineStockItems: 0,
      totalTontineStockAvailable: 0,
      totalCommercialStockItems: 0,
      totalCommercialStockRemaining: 0,
    },
  };
}

export function resolveMockResponse(apiPath: string, method: string): Record<string, unknown> | null {
  if (MockData[apiPath]) {
    return MockData[apiPath];
  }

  const pathname = pathnameOf(apiPath);

  if (method === 'POST' && pathname.includes('/auth/signin')) {
    const loginPath = Object.keys(MockData).find((key) => key.includes('/auth/signin'));
    return loginPath ? MockData[loginPath] : null;
  }

  const clientsMatch = pathname.match(/^\/api\/v1\/clients\/by-commercial\/([^/]+)$/);
  if (clientsMatch && method === 'GET') {
    const mockKey = findMockKeyByPathPrefix(`/api/v1/clients/by-commercial/${clientsMatch[1]!}`);
    if (mockKey) {
      return adaptPagedResponse(MockData[mockKey], apiPath);
    }
  }

  if (pathname === '/api/v1/accounts/by-commercial' && method === 'GET') {
    const mockKey = findAccountsMockKey();
    if (mockKey) {
      return adaptPagedResponse(MockData[mockKey], apiPath);
    }
  }

  const summaryMatch = pathname.match(/^\/api\/v1\/mobiles\/data-summary\/([^/]+)$/);
  if (summaryMatch && method === 'GET') {
    return buildDataSummary(summaryMatch[1]!);
  }

  if (pathname === '/api/v1/tontines/sessions/current' && method === 'GET') {
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: null,
    };
  }

  if (pathname === '/api/v1/mobiles/reliquats' && method === 'GET') {
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: { content: [] },
    };
  }

  return null;
}
