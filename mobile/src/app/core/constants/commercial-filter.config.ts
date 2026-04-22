/**
 * Commercial Filter Configuration
 *
 * This file defines the column names used to filter data by commercial user
 * for each entity type in the database. This ensures that users only see
 * their own data and maintains data isolation between commercials.
 */

/**
 * Type of commercial identifier used for filtering
 */
export enum CommercialFilterType {
    /** Commercial username (string) */
    USERNAME = 'username',
    /** Commercial ID (string/UUID) */
    ID = 'id',
    /** Commercial name (string) */
    NAME = 'name'
}

/**
 * Configuration for commercial filtering on a specific entity
 */
export interface CommercialFilterConfig {
    /** Name of the column in the database table */
    columnName: string;
    /** Type of identifier used */
    filterType: CommercialFilterType;
    /** Whether filtering is required for this entity */
    required: boolean;
}

/**
 * Commercial filter configuration by entity type
 *
 * This mapping defines how to filter each entity type by the connected commercial.
 * All queries must use these configurations to ensure proper data isolation.
 */
export const COMMERCIAL_FILTER_CONFIG: Record<string, CommercialFilterConfig> = {
    // Client entity uses 'commercial' column with commercial name
    client: {
        columnName: 'commercial',
        filterType: CommercialFilterType.NAME,
        required: true
    },

    // Stock output entity uses 'commercialId' column
    stockOutput: {
        columnName: 'commercialId',
        filterType: CommercialFilterType.ID,
        required: true
    },

    // Distribution entity uses 'commercialId' column
    distribution: {
        columnName: 'commercialId',
        filterType: CommercialFilterType.ID,
        required: true
    },

    // Order entity uses 'commercialId' column
    order: {
        columnName: 'commercialId',
        filterType: CommercialFilterType.ID,
        required: true
    },

    // Recovery entity uses 'commercialId' column
    recovery: {
        columnName: 'commercialId', // Reverted to commercialId as 'commercial' column does not exist
        filterType: CommercialFilterType.ID,
        required: true
    },

    // Tontine member entity uses 'commercialUsername' column
    tontineMember: {
        columnName: 'commercialUsername',
        filterType: CommercialFilterType.USERNAME,
        required: true
    },

    // Tontine collection entity uses 'commercialUsername' column
    tontineCollection: {
        columnName: 'commercialUsername',
        filterType: CommercialFilterType.USERNAME,
        required: true
    },

    // Tontine delivery entity uses 'commercialUsername' column
    tontineDelivery: {
        columnName: 'commercialUsername',
        filterType: CommercialFilterType.USERNAME,
        required: true
    },

    // Daily report entity uses 'commercialId' column
    dailyReport: {
        columnName: 'commercialId',
        filterType: CommercialFilterType.ID,
        required: true
    },

    // Article entity is global, no commercial filtering required
    article: {
        columnName: '',
        filterType: CommercialFilterType.ID,
        required: false
    }
};

/**
 * Get the commercial filter configuration for a specific entity type
 *
 * @param entityType The entity type (e.g., 'client', 'distribution')
 * @returns The commercial filter configuration
 * @throws Error if entity type is not configured
 */
export function getCommercialFilterConfig(entityType: string): CommercialFilterConfig {
    const config = COMMERCIAL_FILTER_CONFIG[entityType];
    if (!config) {
        throw new Error(`No commercial filter configuration found for entity type: ${entityType}`);
    }
    return config;
}

/**
 * Build a WHERE clause condition for commercial filtering
 *
 * @param entityType The entity type
 * @param tableAlias Optional table alias for JOIN queries (e.g., 'c', 'tm')
 * @returns SQL WHERE condition string (e.g., 'commercialId = ?')
 */
export function buildCommercialFilterCondition(entityType: string, tableAlias?: string): string {
    const config = getCommercialFilterConfig(entityType);

    if (!config.required) {
        return '';
    }

    const columnRef = tableAlias ? `${tableAlias}.${config.columnName}` : config.columnName;
    return `${columnRef} = ?`;
}
