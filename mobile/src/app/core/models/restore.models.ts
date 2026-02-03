/**
 * Models for database restore functionality
 */

export interface SqlStatement {
  type: 'DELETE' | 'INSERT' | 'UPDATE' | 'CREATE' | 'DROP' | 'UNKNOWN';
  table: string;
  content: string;
  lineNumber: number;
  isMultiLine: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: any;
}

export interface RestoreError {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  statement: string;
  error: string;
  table?: string;
  lineNumber?: number;
}

export interface TableCounts {
  [tableName: string]: number;
}

export interface TableRestoreInfo {
  tableName: string;
  expectedCount: number;
  actualCount: number;
  isValid: boolean;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  results: ValidationResult[];
  summary: string;
}

export interface RestoreResult {
  success: boolean;
  totalStatements: number;
  successfulStatements: number;
  failedStatements: number;
  errors: RestoreError[];
  duration: number;
  tablesRestored: TableRestoreInfo[];
  integrityCheck?: IntegrityCheckResult;
}

export interface PreparedRestore {
  statements: SqlStatement[];
  expectedCounts: TableCounts;
  metadata: any;
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export enum ErrorAction {
  ABORT = 'ABORT',
  CONTINUE = 'CONTINUE'
}