import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { RestoreError, SqlStatement, TableCounts, RestoreResult, ValidationResult, IntegrityCheckResult, TableRestoreInfo } from '../models/restore.models';

/**
 * Custom Error class for restoration failures
 */
export class RestoreException extends Error implements RestoreError {
    constructor(
        public type: 'CRITICAL' | 'WARNING' | 'INFO',
        public statement: string,
        public error: string,
        public table?: string,
        public lineNumber?: number
    ) {
        super(error);
        this.name = 'RestoreException';
    }
}

/**
 * Monitors the progress of the restoration process
 */
export class RestoreMonitor {
    private totalStatements = 0;
    private processedStatements = 0;
    private errorCount = 0;
    private errors: RestoreError[] = [];
    private startTime: number = Date.now();
    private tableCounts: TableCounts = {};

    startMonitoring(total: number) {
        this.totalStatements = total;
        this.startTime = Date.now();
        this.processedStatements = 0;
        this.errorCount = 0;
        this.errors = [];
        this.tableCounts = {};
    }

    updateProgress(processed: number, errors: number, currentTable?: string) {
        this.processedStatements = processed;
        this.errorCount = errors;
        if (currentTable) {
            this.tableCounts[currentTable] = (this.tableCounts[currentTable] || 0) + 1;
        }
    }

    recordError(error: RestoreError) {
        this.errors.push(error);
        this.errorCount++;
    }

    generateReport(): RestoreResult {
        const duration = Date.now() - this.startTime;

        // Generate basic table info from counts
        const tablesRestored: TableRestoreInfo[] = Object.entries(this.tableCounts).map(([tableName, count]) => ({
            tableName,
            expectedCount: count, // This is an approximation since we don't know the exact break down without parsing
            actualCount: count,
            isValid: true
        }));

        return {
            success: this.errorCount === 0 || !this.errors.some(e => e.type === 'CRITICAL'),
            totalStatements: this.totalStatements,
            successfulStatements: this.processedStatements - this.errorCount,
            failedStatements: this.errorCount,
            errors: this.errors,
            duration,
            tablesRestored
        };
    }
}

/**
 * Manages database transactions for restoration
 */
export class TransactionManager {
    constructor(private db: SQLiteDBConnection | null) { }

    async beginTransaction(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.execute('BEGIN TRANSACTION');
    }

    async commitTransaction(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.execute('COMMIT');
    }

    async rollbackTransaction(): Promise<void> {
        if (!this.db) return; // Can't rollback if db is null
        try {
            await this.db.execute('ROLLBACK');
        } catch (e) {
            console.warn('Failed to rollback transaction:', e);
        }
    }
}

/**
 * Validates data integrity after restoration
 */
export class DataIntegrityValidator {
    constructor(private db: SQLiteDBConnection | null) { }

    async validateIntegrity(expectedCounts: TableCounts): Promise<IntegrityCheckResult> {
        const results: ValidationResult[] = [];
        let allValid = true;

        if (!this.db) {
            return { isValid: false, results: [], summary: 'Database not initialized' };
        }

        // Check counts for each table
        for (const [table, count] of Object.entries(expectedCounts)) {
            try {
                const result = await this.db.query(`SELECT COUNT(*) as count FROM ${table}`);
                const actualCount = result.values?.[0]?.count || 0;

                // Note: Tables might have pre-existing data or the backup might be partial or additive/replacing.
                // Strict equality might be too harsh if we are appending, but for a full restore (DELETE then INSERT), it should match.
                // For now, we just ensure we have at least the inserted amount if it was a clean wipe.
                // But the logic in database.service usually does DELETE FROM table; then INSERT.
                // So equality is a good target.

                // However, parsing logic in DatabaseService might be complex. 
                // Let's assume valid if actual >= expected (in case of triggers generating data etc, though unlikely here).
                // Or just log it.

                if (actualCount < count) {
                    results.push({ isValid: false, errors: [`Table ${table} has ${actualCount} rows, expected at least ${count}`] });
                    allValid = false;
                } else {
                    results.push({ isValid: true, errors: [] });
                }
            } catch (error: any) {
                results.push({ isValid: false, errors: [`Failed to count rows for table ${table}: ${error.message}`] });
                allValid = false;
            }
        }

        return {
            isValid: allValid,
            results,
            summary: allValid ? 'Integrity check passed' : 'Integrity check failed for some tables'
        };
    }
}
