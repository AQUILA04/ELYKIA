/**
 * Generic pagination state model
 * 
 * This model provides a reusable structure for managing paginated data
 * in NgRx stores across the application.
 */

/**
 * Pagination state interface
 * 
 * @template T The type of items being paginated
 */
export interface PaginationState<T> {
  /**
   * Current page number (zero-indexed)
   */
  currentPage: number;

  /**
   * Number of items per page
   */
  pageSize: number;

  /**
   * Array of items accumulated from all loaded pages
   * This array grows as more pages are loaded via infinite scroll
   */
  items: T[];

  /**
   * Total number of items available in the database
   * Used to calculate if more pages are available
   */
  totalItems: number;

  /**
   * Indicates if there are more pages to load
   * Calculated as: (currentPage + 1) * pageSize < totalItems
   */
  hasMore: boolean;

  /**
   * Indicates if a page load operation is in progress
   */
  loading: boolean;

  /**
   * Error message if the last load operation failed
   */
  error: string | null;

  /**
   * Optional filters applied to the paginated query
   * The structure depends on the specific entity being queried
   */
  filters?: any;
}

/**
 * Initial pagination state factory
 * 
 * Creates a default pagination state with sensible defaults
 * 
 * @template T The type of items being paginated
 * @param pageSize The page size to use (defaults to DEFAULT_PAGE_SIZE)
 * @returns A new PaginationState object
 */
export function createInitialPaginationState<T>(pageSize: number = 20): PaginationState<T> {
  return {
    currentPage: 0,
    pageSize,
    items: [],
    totalItems: 0,
    hasMore: false,
    loading: false,
    error: null,
    filters: undefined
  };
}

/**
 * Helper function to update pagination state after loading a page
 * 
 * @template T The type of items being paginated
 * @param state Current pagination state
 * @param newItems Items from the newly loaded page
 * @param totalItems Total number of items in the database
 * @param isFirstPage Whether this is the first page being loaded
 * @returns Updated pagination state
 */
export function updatePaginationState<T>(
  state: PaginationState<T>,
  newItems: T[],
  totalItems: number,
  isFirstPage: boolean = false
): PaginationState<T> {
  const items = isFirstPage ? newItems : [...state.items, ...newItems];
  const currentPage = isFirstPage ? 0 : state.currentPage + 1;
  const hasMore = (currentPage + 1) * state.pageSize < totalItems;

  return {
    ...state,
    currentPage,
    items,
    totalItems,
    hasMore,
    loading: false,
    error: null
  };
}

/**
 * Helper function to reset pagination state
 * 
 * Useful when filters change or when a full refresh is needed
 * 
 * @template T The type of items being paginated
 * @param state Current pagination state
 * @param filters Optional new filters to apply
 * @returns Reset pagination state
 */
export function resetPaginationState<T>(
  state: PaginationState<T>,
  filters?: any
): PaginationState<T> {
  return {
    ...state,
    currentPage: 0,
    items: [],
    totalItems: 0,
    hasMore: false,
    loading: false,
    error: null,
    filters: filters !== undefined ? filters : state.filters
  };
}
