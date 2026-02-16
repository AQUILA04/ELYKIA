/**
 * Pagination constants for the application
 * 
 * These constants define the default pagination behavior across all paginated lists
 * in the mobile application, ensuring consistent UX and performance.
 */

/**
 * Default page size for paginated queries
 * 
 * This value determines how many items are loaded per page from the local SQLite database.
 * A value of 20 provides a good balance between:
 * - Network efficiency (for future sync operations)
 * - Memory usage (avoiding loading entire datasets)
 * - User experience (smooth scrolling with reasonable load times)
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Initial page number (zero-indexed)
 * 
 * All pagination starts at page 0 to align with OFFSET calculations in SQL queries.
 */
export const INITIAL_PAGE = 0;
