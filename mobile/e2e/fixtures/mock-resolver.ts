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

/** Seed used by @smoke tontine delivery order scenarios (S1 / S2). Mutable for post-write refresh. */
const E2E_TONTINE_DELIVERY_MEMBERS: Array<Record<string, unknown>> = [
  {
    id: 91001,
    client: {
      id: 29,
      firstname: 'BOBO',
      lastname: 'DIOUF',
      fullName: 'BOBO DIOUF',
      phone: '90934343',
      collector: 'COM002',
      quarter: 'AGBODI KOKLO',
    },
    commercialUsername: 'COM002',
    totalContribution: 100000,
    availableContribution: 90000,
    societyShare: 10000,
    deliveryStatus: 'SESSION_INPROGRESS',
    registrationDate: '2026-02-01T00:00:00',
    frequency: 'WEEKLY',
    amount: 5000,
  },
  {
    id: 91002,
    client: {
      id: 4,
      firstname: 'VITOR',
      lastname: 'NOUHNA',
      fullName: 'VITOR NOUHNA',
      phone: '97779988',
      collector: 'COM002',
      quarter: 'DEVANT 1er PONT',
    },
    commercialUsername: 'COM002',
    totalContribution: 100000,
    availableContribution: 90000,
    societyShare: 10000,
    deliveryStatus: 'SESSION_INPROGRESS',
    registrationDate: '2026-02-01T00:00:00',
    frequency: 'WEEKLY',
    amount: 5000,
  },
];

function findE2eMember(memberId: number): Record<string, unknown> | undefined {
  return E2E_TONTINE_DELIVERY_MEMBERS.find((member) => member.id === memberId);
}

function markE2eMemberDelivery(
  memberId: number,
  status: 'PENDING' | 'DELIVERED',
  deliveryId: number
): void {
  const member = findE2eMember(memberId);
  if (!member) {
    return;
  }
  member.deliveryStatus = status;
  member.delivery = {
    id: deliveryId,
    tontineMemberId: memberId,
    requestDate: '2026-09-18T10:00:00',
    deliveryDate: status === 'DELIVERED' ? '2026-09-18T10:05:00' : '2026-09-18T10:00:00',
    totalAmount: 5000,
    status,
    items: [
      {
        id: deliveryId * 10,
        articleId: 11,
        quantity: 1,
        unitPrice: 5000,
        totalPrice: 5000,
      },
    ],
  };
}
const E2E_TONTINE_STOCKS = [
  {
    id: 88001,
    commercial: 'COM002',
    articleId: 11,
    articleName: 'Article E2E Tontine',
    unitPrice: 5000,
    totalQuantity: 50,
    availableQuantity: 50,
    distributedQuantity: 0,
    year: 2026,
    tontineSessionId: 1,
  },
];

const E2E_TONTINE_COLLECTIONS = [
  {
    id: 50101,
    tontineMemberId: 91001,
    amount: 100000,
    collectionDate: '2026-03-15T00:00:00',
    societyShareAmount: 10000,
    contributionMonth: '2026-03-01',
    commercialUsername: 'COM002',
    advanceToNextMonth: false,
  },
  {
    id: 50102,
    tontineMemberId: 91002,
    amount: 100000,
    collectionDate: '2026-03-15T00:00:00',
    societyShareAmount: 10000,
    contributionMonth: '2026-03-01',
    commercialUsername: 'COM002',
    advanceToNextMonth: false,
  },
];

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
      totalTontineMembers: E2E_TONTINE_DELIVERY_MEMBERS.length,
      totalTontineCollections: E2E_TONTINE_COLLECTIONS.length,
      totalTontineDeliveries: 0,
      totalArticles: paginatedTotal('/api/v1/articles'),
      totalLocalities,
      totalStockOutputs: 0,
      totalAccounts: paginatedTotal('/api/v1/accounts/by-commercial'),
      totalTontineStockItems: E2E_TONTINE_STOCKS.length,
      totalTontineStockAvailable: E2E_TONTINE_STOCKS.reduce((sum, s) => sum + s.availableQuantity, 0),
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

  if (pathname === '/api/v1/tontines/members' && method === 'GET') {
    return adaptPagedResponse(
      {
        status: 'OK',
        statusCode: 200,
        message: 'default.message.success',
        service: 'MOCK-SERVICE',
        data: {
          content: E2E_TONTINE_DELIVERY_MEMBERS,
          page: {
            size: 20,
            number: 0,
            totalElements: E2E_TONTINE_DELIVERY_MEMBERS.length,
            totalPages: 1,
          },
        },
      },
      apiPath
    );
  }

  if (pathname === '/api/v1/tontines/sessions/current' && method === 'GET') {
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        id: 1,
        year: 2026,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        status: 'CLOSED',
        memberCount: E2E_TONTINE_DELIVERY_MEMBERS.length,
        totalCollected: 200000,
      },
    };
  }

  if (pathname === '/api/v1/tontines/stock' && method === 'GET') {
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        content: E2E_TONTINE_STOCKS,
        page: {
          size: E2E_TONTINE_STOCKS.length,
          number: 0,
          totalElements: E2E_TONTINE_STOCKS.length,
          totalPages: 1,
        },
      },
    };
  }

  if (pathname === '/api/v1/tontines/deliveries/distribute' && method === 'POST') {
    markE2eMemberDelivery(91001, 'DELIVERED', 92001);
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        id: 92001,
        tontineMemberId: 91001,
        reference: 'TNT-E2E-DIR',
        totalAmount: 5000,
        status: 'DELIVERED',
        deliveryStatus: 'DELIVERED',
        requestDate: '2026-09-18T10:00:00',
        deliveryDate: '2026-09-18T10:05:00',
      },
    };
  }

  if (pathname === '/api/v1/tontines/deliveries' && method === 'POST') {
    markE2eMemberDelivery(91002, 'PENDING', 92002);
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        id: 92002,
        tontineMemberId: 91002,
        reference: 'TNT-E2E-ORD',
        totalAmount: 5000,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        requestDate: '2026-09-18T10:00:00',
        deliveryDate: '2026-09-18T10:00:00',
      },
    };
  }

  const deliverMatch = pathname.match(/^\/api\/v1\/tontines\/deliveries\/(\d+)\/deliver$/);
  if (deliverMatch && method === 'PATCH') {
    markE2eMemberDelivery(91002, 'DELIVERED', Number(deliverMatch[1]));
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        id: Number(deliverMatch[1]),
        tontineMemberId: 91002,
        reference: 'TNT-E2E-ORD',
        totalAmount: 5000,
        status: 'DELIVERED',
        deliveryStatus: 'DELIVERED',
        requestDate: '2026-09-18T10:00:00',
        deliveryDate: '2026-09-18T11:00:00',
      },
    };
  }

  if (pathname === '/api/v1/tontines/collections' && method === 'GET') {
    return adaptPagedResponse(
      {
        status: 'OK',
        statusCode: 200,
        message: 'default.message.success',
        service: 'MOCK-SERVICE',
        data: {
          content: E2E_TONTINE_COLLECTIONS,
          page: {
            size: 20,
            number: 0,
            totalElements: E2E_TONTINE_COLLECTIONS.length,
            totalPages: 1,
          },
        },
      },
      apiPath
    );
  }

  if (pathname === '/api/v1/tontines/collections' && method === 'POST') {
    return {
      status: 'OK',
      statusCode: 200,
      message: 'default.message.success',
      service: 'MOCK-SERVICE',
      data: {
        id: 501,
        amount: 5000,
        collectionDate: '2026-03-15T00:00:00',
        societyShareAmount: 1000,
        contributionMonth: '2026-03-01',
        advanceToNextMonth: false,
      },
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
