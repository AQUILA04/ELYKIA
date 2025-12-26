// ============================================================================
// Types et Interfaces pour le Module BI Dashboard
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export enum PeriodType {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM'
}

export enum StockStatus {
  NORMAL = 'NORMAL',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  OVERSTOCK = 'OVERSTOCK'
}

export enum StockUrgency {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum SolvencyNote {
  EARLY = 'EARLY',
  TIME = 'TIME',
  LATE = 'LATE',
  ND = 'ND'
}

export enum ClientType {
  PROMOTER = 'PROMOTER',
  CLIENT = 'CLIENT'
}

// ============================================================================
// FILTRES
// ============================================================================

export interface PeriodFilter {
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
}

export interface SalesFilter extends PeriodFilter {
  collector?: string;
  clientType?: ClientType;
  status?: string;
  zone?: string;
}

export interface CollectionFilter extends PeriodFilter {
  collector?: string;
  solvencyNote?: SolvencyNote;
  riskLevel?: string;
}

export interface StockFilter {
  category?: string;
  status?: StockStatus;
  isSeasonal?: boolean;
}

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export interface DashboardOverview {
  sales: SalesMetrics;
  collections: CollectionMetrics;
  stock: StockMetrics;
  portfolio: PortfolioMetrics;
}

export interface SalesMetrics {
  totalAmount: number;
  totalProfit: number;
  profitMargin: number;
  count: number;
  evolution: number;
  averageSaleAmount: number;
}

export interface CollectionMetrics {
  totalCollected: number;
  collectionRate: number;
  evolution: number;
  onTimePaymentsCount: number;
  latePaymentsCount: number;
}

export interface StockMetrics {
  totalValue: number;
  itemsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  averageTurnoverRate: number;
}

export interface PortfolioMetrics {
  activeCreditsCount: number;
  totalOutstanding: number;
  totalOverdue: number;
  par7: number;
  par15: number;
  par30: number;
}

// ============================================================================
// ANALYSE DES VENTES
// ============================================================================

export interface SalesTrend {
  date: string;
  salesCount: number;
  totalAmount: number;
  totalProfit: number;
  averageSaleAmount: number;
}

export interface CommercialPerformance {
  collector: string;
  periodStart: string;
  periodEnd: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalProfit: number;
  averageSaleAmount: number;
  totalCollected: number;
  collectionRate: number;
  onTimePaymentsCount: number;
  latePaymentsCount: number;
  activeClientsCount: number;
  newClientsCount: number;
  clientRetentionRate: number;
  portfolioAtRisk: number;
  criticalAccountsCount: number;
}

export interface ArticlePerformance {
  articleId: number;
  articleName: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  turnoverRate: number;
  stockQuantity: number;
  contributionToRevenue: number;
}

// ============================================================================
// ANALYSE DES RECOUVREMENTS
// ============================================================================

export interface CollectionTrend {
  date: string;
  collected: number;
  expected: number;
  collectionRate: number;
  paymentsCount: number;
}

export interface OverdueAnalysis {
  range: string;
  creditsCount: number;
  totalAmount: number;
  percentage: number;
}

export interface SolvencyDistribution {
  solvencyNote: SolvencyNote;
  count: number;
  percentage: number;
  totalAmount: number;
}

// ============================================================================
// ANALYSE DU STOCK
// ============================================================================

export interface StockAlert {
  articleId: number;
  articleName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  urgency: StockUrgency;
  averageMonthlySales: number;
  daysOfStockRemaining: number;
}

export interface StockAnalytics {
  articleId: number;
  articleName: string;
  category: string;
  stockQuantity: number;
  purchasePrice: number;
  creditSalePrice: number;
  stockValue: number;
  unitMargin: number;
  reorderPoint: number;
  optimalStockLevel: number;
  stockStatus: StockStatus;
  salesLast30Days: number;
  turnoverRate: number;
}

export interface StockMovement {
  id: number;
  articleId: number;
  articleName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  movementDate: string;
  reason: string;
  performedBy: string;
  relatedCreditId?: number;
  unitCost: number;
}

// ============================================================================
// KPI CARD
// ============================================================================

export interface KpiCardData {
  title: string;
  value: number | string;
  evolution?: number;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  format?: 'currency' | 'number' | 'percentage';
  trend?: number[];
  subtitle?: string;
}

// ============================================================================
// GRAPHIQUES
// ============================================================================

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

// ============================================================================
// ALERTES
// ============================================================================

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  count?: number;
  action?: string;
  actionLink?: string;
}

// ============================================================================
// RESPONSE API
// ============================================================================

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: T;
}
