/**
 * Date Filter Model
 * 
 * Generic interface for filtering data by date range.
 * Used by Repository Extensions and KPI Store for performance optimization.
 * 
 * **Usage Examples:**
 * 
 * 1. Filter by specific date (Rapport Journalier):
 *    ```typescript
 *    { startDate: '2024-02-18', endDate: '2024-02-18' }
 *    ```
 * 
 * 2. Filter by date range (Dashboard - Month):
 *    ```typescript
 *    { startDate: '2024-02-01', endDate: '2024-02-29' }
 *    ```
 * 
 * 3. Filter from date onwards (Dashboard - Today):
 *    ```typescript
 *    { startDate: '2024-02-18' }
 *    ```
 * 
 * 4. No filter (load all data):
 *    ```typescript
 *    undefined or {}
 *    ```
 */
export interface DateFilter {
  /**
   * Start date in ISO format (YYYY-MM-DD)
   * 
   * If provided without endDate, filters all records >= startDate
   */
  startDate?: string;
  
  /**
   * End date in ISO format (YYYY-MM-DD)
   * 
   * If provided without startDate, filters all records <= endDate
   */
  endDate?: string;
  
  /**
   * Name of the date column to filter on
   * 
   * Defaults to 'createdAt' if not specified
   * 
   * Common values:
   * - 'createdAt' (distributions, clients, orders)
   * - 'paymentDate' (recoveries)
   * - 'collectionDate' (tontine_collections)
   * - 'deliveryDate' (tontine_deliveries)
   */
  dateColumn?: string;
}

/**
 * Helper function to build SQL WHERE clause for date filtering
 * 
 * @param dateFilter Optional date filter
 * @param defaultColumn Default column name if not specified in filter (default: 'createdAt')
 * @returns Object containing whereClause string and params array
 */
export function buildDateFilterClause(
  dateFilter?: DateFilter,
  defaultColumn: string = 'createdAt'
): { whereClause: string; params: string[] } {
  if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) {
    return { whereClause: '', params: [] };
  }

  const column = dateFilter.dateColumn || defaultColumn;
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFilter.startDate) {
    conditions.push(`DATE(${column}) >= ?`);
    params.push(dateFilter.startDate);
  }

  if (dateFilter.endDate) {
    conditions.push(`DATE(${column}) <= ?`);
    params.push(dateFilter.endDate);
  }

  return {
    whereClause: conditions.join(' AND '),
    params
  };
}

/**
 * Helper function to create a DateFilter for today
 * 
 * @param dateColumn Optional column name (default: 'createdAt')
 * @returns DateFilter for today
 */
export function createTodayFilter(dateColumn?: string): DateFilter {
  const today = new Date().toISOString().split('T')[0];
  return {
    startDate: today,
    endDate: today,
    dateColumn
  };
}

/**
 * Helper function to create a DateFilter for a period
 * 
 * @param period Period type ('today' | 'week' | 'month' | 'year')
 * @param dateColumn Optional column name (default: 'createdAt')
 * @returns DateFilter for the specified period
 */
export function createPeriodFilter(
  period: 'today' | 'week' | 'month' | 'year',
  dateColumn?: string
): DateFilter {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      const weekStartDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    dateColumn
  };
}
