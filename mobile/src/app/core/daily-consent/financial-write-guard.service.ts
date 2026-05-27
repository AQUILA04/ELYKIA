import { Injectable, Injector } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DailyConsentStateService } from './daily-consent-state.service';
import { ConsentRequiredError } from './daily-consent.errors';

const FINANCIAL_TABLES = new Set([
  'distributions', 'recoveries', 'orders', 'order_items',
  'tontine_members', 'tontine_collections', 'tontine_deliveries'
]);

/** Colonnes autorisées dans un UPDATE purement technique (sync / remapping). */
const SYNC_METADATA_COLUMNS = new Set([
  'issync', 'syncdate', 'synchash', 'islocal', 'id'
]);

const INSERT_RE = /^\s*INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(\w+)\s*\(([^)]+)\)/i;
const UPDATE_RE = /^\s*UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\b|$)/is;

@Injectable({ providedIn: 'root' })
export class FinancialWriteGuardService {

  constructor(
    private readonly injector: Injector,
    private readonly stateService: DailyConsentStateService
  ) {}

  /**
   * Bloque uniquement les INSERT/UPDATE métier avec isLocal = 1 (opération terrain).
   * Les données serveur (isLocal = 0), les mises à jour de sync et les tables sans isLocal sont libres.
   */
  checkSql(sql: string, values?: unknown[]): void {
    const username = this.injector.get(AuthService).currentUser?.username;
    if (!username) return;

    if (this.stateService.isConsentActiveForToday(username)) return;

    const table = this.extractFinancialTable(sql);
    if (!table) return;

    if (!this.requiresDailyConsent(sql, values)) return;

    throw new ConsentRequiredError(
      `Consentement journalier requis pour écrire dans la table "${table}".`
    );
  }

  private requiresDailyConsent(sql: string, values?: unknown[]): boolean {
    const normalized = sql.trim();

    if (/^\s*INSERT(?:\s+OR\s+REPLACE)?\s+INTO\b/i.test(normalized)) {
      return this.insertRequiresConsent(normalized, values);
    }

    if (/^\s*UPDATE\b/i.test(normalized)) {
      return this.updateRequiresConsent(normalized, values);
    }

    return true;
  }

  private insertRequiresConsent(sql: string, values?: unknown[]): boolean {
    const match = INSERT_RE.exec(sql);
    if (!match) return true;

    const columns = match[2].split(',').map(c => c.trim().toLowerCase());
    const isLocalIdx = columns.indexOf('islocal');

    if (isLocalIdx === -1) {
      // Pas de colonne isLocal (ex. order_items) — pas une création locale directe
      return false;
    }

    if (!values || isLocalIdx >= values.length) return true;

    return this.isLocalFlag(values[isLocalIdx]);
  }

  private updateRequiresConsent(sql: string, values?: unknown[]): boolean {
    const match = UPDATE_RE.exec(sql);
    if (!match) return true;

    const setClause = match[2];
    const assignments = this.parseSetAssignments(setClause);

    if (assignments.length === 0) return true;

    if (assignments.every(a => SYNC_METADATA_COLUMNS.has(a.column))) {
      return false;
    }

    const isLocalAssignment = assignments.find(a => a.column === 'islocal');
    if (!isLocalAssignment) {
      // UPDATE métier sans toucher isLocal : on suppose données déjà locales
      return true;
    }

    if (isLocalAssignment.isLiteral) {
      return isLocalAssignment.literalValue === '1';
    }

    if (values && isLocalAssignment.paramIndex !== undefined) {
      return this.isLocalFlag(values[isLocalAssignment.paramIndex]);
    }

    return true;
  }

  private parseSetAssignments(setClause: string): Array<{
    column: string;
    isLiteral: boolean;
    literalValue?: string;
    paramIndex?: number;
  }> {
    const assignments: Array<{
      column: string;
      isLiteral: boolean;
      literalValue?: string;
      paramIndex?: number;
    }> = [];
    let paramIndex = 0;

    for (const part of setClause.split(',')) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const column = trimmed.slice(0, eqIdx).trim().toLowerCase();
      const rhs = trimmed.slice(eqIdx + 1).trim();

      if (rhs === '?') {
        assignments.push({ column, isLiteral: false, paramIndex: paramIndex++ });
      } else {
        assignments.push({
          column,
          isLiteral: true,
          literalValue: rhs.replace(/['"]/g, '')
        });
      }
    }

    return assignments;
  }

  private isLocalFlag(value: unknown): boolean {
    return value === 1 || value === true || value === '1';
  }

  private extractFinancialTable(sql: string): string | null {
    const insertMatch = INSERT_RE.exec(sql);
    if (insertMatch) {
      const table = insertMatch[1].toLowerCase();
      return FINANCIAL_TABLES.has(table) ? table : null;
    }

    const updateMatch = UPDATE_RE.exec(sql);
    if (updateMatch) {
      const table = updateMatch[1].toLowerCase();
      return FINANCIAL_TABLES.has(table) ? table : null;
    }

    return null;
  }
}
