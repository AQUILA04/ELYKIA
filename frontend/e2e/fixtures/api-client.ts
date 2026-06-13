import {
  API_URL,
  resolveCredentials,
  TEST_AGENCY_COMMERCIAL_USERNAME,
  TEST_COMMERCIAL_USERNAME,
} from './test-data';

export interface AuthTokenResponse {
  token: string;
  username: string;
  roles: string[];
}

export interface TestArticle {
  id: number;
  label: string;
  commercialName?: string;
  name?: string;
  type?: string;
  marque?: string;
  model?: string;
  stockQuantity?: number;
}

function buildArticleSearchLabel(article: TestArticle): string {
  if (article.commercialName?.trim()) {
    return article.commercialName.trim();
  }
  if (article.type && article.marque) {
    const modelPart = article.model ? ` ${article.model}` : '';
    return `${article.type}: ${article.marque}${modelPart}`;
  }
  return article.name?.trim() || `article-${article.id}`;
}

interface ApiEnvelope<T> {
  statusCode?: number;
  data?: T;
}

interface PagedArticles {
  content?: TestArticle[];
}

export interface StockRequestSummary {
  id: number;
  reference: string;
  status: string;
  collector: string;
}

interface PagedStockRequests {
  content?: StockRequestSummary[];
}

export interface CreditSummary {
  id: number;
  reference: string;
  status: string;
  dailyStake?: number;
  totalAmount?: number;
  collector?: string;
  client?: { firstname?: string; lastname?: string };
}

interface PagedCredits {
  content?: CreditSummary[];
}

export interface RecouvrementRow {
  reference: string;
  creditReference: string;
  clientName: string;
  commercial: string;
  amount: number;
}

interface PagedRecouvrements {
  content?: RecouvrementRow[];
}

export interface MonthlyStockItem {
  id?: number;
  articleId: number;
  quantityTaken?: number;
  quantitySold?: number;
  quantityReturned?: number;
  quantityRemaining?: number;
  weightedAverageUnitPrice?: number;
  article?: { id?: number; commercialName?: string; name?: string };
}

export interface CommercialMonthlyStock {
  id?: number;
  month?: number;
  year?: number;
  collector?: string;
  items?: MonthlyStockItem[];
}

export interface DailyCommercialReport {
  commercialUsername: string;
  creditSalesCount?: number;
  creditSalesAmount?: number;
  collectionsCount?: number;
  collectionsAmount?: number;
  totalAmountToDeposit?: number;
  totalAmountDeposited?: number;
  tontineMembersCount?: number;
  tontineCollectionsCount?: number;
  tontineCollectionsAmount?: number;
  tontineDeliveriesCount?: number;
  tontineDeliveriesAmount?: number;
  totalTontineStockRequestAmount?: number;
}

export interface TontineStockItem {
  id?: number;
  articleId: number;
  articleName?: string;
  availableQuantity?: number;
  commercial?: string;
  year?: number;
}

export interface StockReturnSummary {
  id: number;
  collector: string;
  status: string;
}

export interface StockTontineRequestSummary {
  id: number;
  reference: string;
  status: string;
  collector: string;
}

export interface TontineMemberSummary {
  id: number;
  deliveryStatus?: string;
  totalContribution?: number;
  client?: { id?: number; firstname?: string; lastname?: string };
}

interface PagedStockReturns {
  content?: StockReturnSummary[];
}

interface PagedStockTontineRequests {
  content?: StockTontineRequestSummary[];
}

interface PagedTontineMembers {
  content?: TontineMemberSummary[];
}

/**
 * Client HTTP pour préparer et vérifier les données de test via l'API backend.
 */
export class ApiClient {
  private token: string | null = null;

  constructor(private readonly baseUrl: string = API_URL) {}

  async signIn(username: string, password: string): Promise<AuthTokenResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
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
      throw new Error(`No token in sign-in response for ${username}`);
    }

    this.token = token;
    return {
      token,
      username: body.username ?? username,
      roles: body.roles ?? [],
    };
  }

  async signInAsGestionnaire(): Promise<AuthTokenResponse> {
    const { username, password } = await resolveCredentials('gestionnaire');
    return this.signIn(username, password);
  }

  async signInAsMagasinier(): Promise<AuthTokenResponse> {
    const { username, password } = await resolveCredentials('magasinier');
    return this.signIn(username, password);
  }

  async signInAsCommercial(): Promise<AuthTokenResponse> {
    const { username, password } = await resolveCredentials('commercial');
    return this.signIn(username, password);
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error('ApiClient: call signIn() first');
    }
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`GET ${path} failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`POST ${path} failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`PATCH ${path} failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async getEnabledArticles(): Promise<TestArticle[]> {
    const response = await this.get<ApiEnvelope<PagedArticles | TestArticle[]>>(
      '/api/v1/articles/enabled?size=500',
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return data?.content ?? [];
  }

  async makeStockEntries(articleId: number, quantity: number): Promise<void> {
    await this.patch('/api/v1/articles/make-stock-entries', {
      articleEntries: [{ articleId, quantity }],
    });
  }

  /**
   * Garantit qu'au moins un article activé dispose du stock magasin demandé.
   */
  async getStockRequests(collector?: string, page = 0, size = 100): Promise<StockRequestSummary[]> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    const data = await this.get<PagedStockRequests>(
      `/api/stock-requests?page=${page}&size=${size}${collectorQuery}`,
    );
    return data.content ?? [];
  }

  async getStockRequestStatus(reference: string, collector: string): Promise<string | null> {
    const requests = await this.getStockRequests(collector, 0, 200);
    return requests.find((request) => request.reference === reference)?.status ?? null;
  }

  async getCreditsByCommercial(collector: string, page = 0, size = 100): Promise<CreditSummary[]> {
    const response = await this.get<ApiEnvelope<PagedCredits>>(
      `/api/v1/credits/by-commercial/${encodeURIComponent(collector)}?page=${page}&size=${size}&sort=id,desc`,
    );
    return response.data?.content ?? [];
  }

  async searchCredits(
    criteria: {
      keyword?: string;
      commercial?: string;
      type?: string;
      status?: string;
      clientId?: number;
    },
    page = 0,
    size = 100,
  ): Promise<CreditSummary[]> {
    const response = await this.post<ApiEnvelope<PagedCredits>>(
      `/api/v1/credits/fetch?page=${page}&size=${size}&sort=id,desc`,
      criteria,
    );
    return response.data?.content ?? [];
  }

  async findCreditByClientLastName(
    collector: string,
    clientLastName: string,
  ): Promise<CreditSummary | null> {
    const credits = await this.getCreditsByCommercial(collector, 0, 200);
    return (
      credits.find((credit) => credit.client?.lastname === clientLastName) ?? null
    );
  }

  async makeDailyStake(creditId: number, amount: number): Promise<void> {
    await this.post('/api/v1/credits/daily-stake', { creditId, amount });
  }

  async getRecouvrements(
    dateFrom: string,
    dateTo: string,
    collector?: string,
  ): Promise<RecouvrementRow[]> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    const response = await this.get<ApiEnvelope<PagedRecouvrements>>(
      `/api/v1/recouvrements?dateFrom=${dateFrom}&dateTo=${dateTo}&page=0&size=500${collectorQuery}`,
    );
    return response.data?.content ?? [];
  }

  /** Ouvre la journée comptable (idempotent) — prérequis aux mises / recouvrements. */
  async ensureAccountingDayOpen(): Promise<void> {
    await this.get('/api/v1/accounting-days/open');
  }

  async getDailyReports(
    startDate: string,
    endDate: string,
    collector?: string,
  ): Promise<DailyCommercialReport[]> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    return this.get<DailyCommercialReport[]>(
      `/api/daily-commercial-reports/search?startDate=${startDate}&endDate=${endDate}${collectorQuery}`,
    );
  }

  async getCurrentMonthlyStock(collector: string): Promise<CommercialMonthlyStock | null> {
    try {
      return await this.get<CommercialMonthlyStock>(
        `/api/commercial-stocks/current/${encodeURIComponent(collector)}`,
      );
    } catch {
      return null;
    }
  }

  async findCashSaleByClientLastName(clientLastName: string): Promise<CreditSummary | null> {
    const credits = await this.searchCredits({
      keyword: clientLastName,
      commercial: TEST_AGENCY_COMMERCIAL_USERNAME,
      type: 'CASH',
    });
    return (
      credits.find(
        (credit) =>
          credit.client?.lastname === clientLastName &&
          credit.collector === TEST_AGENCY_COMMERCIAL_USERNAME &&
          credit.reference?.startsWith('CSH-'),
      ) ?? null
    );
  }

  async getStockReturns(collector?: string): Promise<StockReturnSummary[]> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    const data = await this.get<PagedStockReturns>(
      `/api/stock-returns?page=0&size=200${collectorQuery}`,
    );
    return data.content ?? [];
  }

  async getStockReturnStatus(id: number): Promise<string | null> {
    const returns = await this.getStockReturns();
    return returns.find((row) => row.id === id)?.status ?? null;
  }

  async getStockTontineRequests(collector?: string): Promise<StockTontineRequestSummary[]> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    const data = await this.get<PagedStockTontineRequests>(
      `/api/v1/stock-tontine-request?page=0&size=200${collectorQuery}`,
    );
    return data.content ?? [];
  }

  async getStockTontineRequestStatus(reference: string, collector: string): Promise<string | null> {
    const requests = await this.getStockTontineRequests(collector);
    return requests.find((request) => request.reference === reference)?.status ?? null;
  }

  async findTontineMemberByClientLastName(clientLastName: string): Promise<TontineMemberSummary | null> {
    const response = await this.get<ApiEnvelope<PagedTontineMembers>>(
      `/api/v1/tontines/members?search=${encodeURIComponent(clientLastName)}&page=0&size=50`,
    );
    const members = response.data?.content ?? [];
    return members.find((member) => member.client?.lastname === clientLastName) ?? null;
  }

  async closeCurrentTontineSession(): Promise<void> {
    await this.post('/api/v1/tontines/sessions/current/close', {});
  }

  async getCurrentTontineSessionStatus(): Promise<string | null> {
    const response = await this.get<ApiEnvelope<{ status?: string }>>(
      '/api/v1/tontines/sessions/current',
    );
    return response.data?.status ?? null;
  }

  async getTontineStockForArticle(
    commercial: string,
    articleId: number,
  ): Promise<TontineStockItem | null> {
    const response = await this.get<ApiEnvelope<{ content?: TontineStockItem[] }>>(
      `/api/v1/tontines/stock?commercial=${encodeURIComponent(commercial)}&size=200`,
    );
    const items = response.data?.content ?? [];
    return items.find((item) => item.articleId === articleId) ?? null;
  }

  async ensureTontineSessionActive(): Promise<void> {
    let status = await this.getCurrentTontineSessionStatus();
    if (status !== 'ACTIVE') {
      await this.post('/api/v1/tontines/sessions/current/reopen', {});
      for (let attempt = 0; attempt < 10; attempt++) {
        status = await this.getCurrentTontineSessionStatus();
        if (status === 'ACTIVE') {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error(`Session tontine non ACTIVE après réouverture (statut: ${status ?? 'inconnu'})`);
    }
  }

  async seedResidualStockForE2e(
    collector: string,
    articleId: number,
    quantity: number,
  ): Promise<CommercialMonthlyStock> {
    const response = await this.post<ApiEnvelope<CommercialMonthlyStock>>(
      '/api/v1/commercial-stock/e2e/seed-residual',
      { collector, articleId, quantity },
    );
    return response.data!;
  }

  async getResidualStocks(collector: string): Promise<CommercialMonthlyStock[]> {
    const response = await this.get<ApiEnvelope<CommercialMonthlyStock[]>>(
      `/api/v1/commercial-stock/residual?collector=${encodeURIComponent(collector)}`,
    );
    return response.data ?? [];
  }

  async findRattrapageCreditByClientLastName(
    clientLastName: string,
  ): Promise<CreditSummary | null> {
    const credits = await this.searchCredits({
      keyword: clientLastName,
      commercial: TEST_COMMERCIAL_USERNAME,
      type: 'CREDIT',
      status: 'INPROGRESS',
    });
    return (
      credits.find(
        (credit) =>
          credit.reference?.startsWith('RAT-') &&
          credit.client?.lastname === clientLastName,
      ) ?? null
    );
  }

  async getResidualStockItemRemaining(
    collector: string,
    articleId: number,
  ): Promise<{ stockId: number; itemId: number; quantityRemaining: number } | null> {
    const stocks = await this.getResidualStocks(collector);
    for (const stock of stocks) {
      const item = stock.items?.find(
        (row) => (row.article?.id ?? row.articleId) === articleId,
      );
      if (item?.id != null && stock.id != null) {
        return {
          stockId: stock.id,
          itemId: item.id,
          quantityRemaining: item.quantityRemaining ?? 0,
        };
      }
    }
    return null;
  }

  async getTontineCollectionSummary(
    dateFrom: string,
    dateTo: string,
    collector?: string,
  ): Promise<{ totalMises?: number; totalMontant?: number }> {
    const collectorQuery = collector ? `&collector=${encodeURIComponent(collector)}` : '';
    const response = await this.get<ApiEnvelope<{ totalMises?: number; totalMontant?: number }>>(
      `/api/v1/tontine-collections/web/summary?dateFrom=${dateFrom}&dateTo=${dateTo}${collectorQuery}`,
    );
    return response.data ?? {};
  }

  async getMonthlyStockItem(
    collector: string,
    articleId: number,
  ): Promise<MonthlyStockItem | null> {
    const stock = await this.getCurrentMonthlyStock(collector);
    return (
      stock?.items?.find(
        (item) => (item.article?.id ?? item.articleId) === articleId,
      ) ?? null
    );
  }

  async ensureCommercialStockRemaining(
    collector: string,
    articleId: number,
    minRemaining: number,
    timeoutMs = 30_000,
  ): Promise<MonthlyStockItem> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const item = await this.getMonthlyStockItem(collector, articleId);
      if (item && (item.quantityRemaining ?? 0) >= minRemaining) {
        return item;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const last = await this.getMonthlyStockItem(collector, articleId);
    throw new Error(
      `Stock commercial insuffisant pour l'article ${articleId} (${collector}) : ` +
        `${last?.quantityRemaining ?? 0} restant, ${minRemaining} requis`,
    );
  }

  async ensureArticleWithStock(minQuantity = 10): Promise<TestArticle> {
    const articles = await this.getEnabledArticles();
    if (articles.length === 0) {
      throw new Error('Aucun article activé disponible pour les tests E2E');
    }

    const withStock = articles.find((article) => (article.stockQuantity ?? 0) >= minQuantity);
    if (withStock) {
      return {
        ...withStock,
        label: buildArticleSearchLabel(withStock),
      };
    }

    const target = articles[0]!;
    await this.makeStockEntries(target.id, minQuantity);
    return {
      ...target,
      label: buildArticleSearchLabel(target),
      stockQuantity: minQuantity,
    };
  }
}
