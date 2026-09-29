import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_EVENT_OPTIONS,
  AUDIT_SOURCE_LABELS,
  AuditCategory,
  AuditSource,
  auditEventLabel,
  isFailureEvent,
} from '../../constants/audit-event-taxonomy';
import {
  CustomerActivityAuditService,
  CustomerActivityLog,
  CustomerActivityLogFilters,
  CustomerActivityLogSummary,
} from '../../services/customer-activity-audit.service';

@Component({
  selector: 'app-activity-log-list',
  templateUrl: './activity-log-list.component.html',
  styleUrls: ['./activity-log-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class ActivityLogListComponent implements OnInit, OnDestroy {
  rows: CustomerActivityLog[] = [];
  summary: CustomerActivityLogSummary | null = null;
  loading = false;
  selected: CustomerActivityLog | null = null;
  sessionEvents: CustomerActivityLog[] = [];
  sessionLoading = false;
  showSessionPanel = false;
  currentDate = new Date();
  lastUpdate = new Date();
  pageIndex = 0;
  pageSize = 50;
  totalElements = 0;

  readonly categoryLabels = AUDIT_CATEGORY_LABELS;
  readonly sourceLabels = AUDIT_SOURCE_LABELS;
  readonly eventOptions = AUDIT_EVENT_OPTIONS;
  readonly auditEventLabel = auditEventLabel;
  readonly isFailureEvent = isFailureEvent;

  filters: CustomerActivityLogFilters = this.defaultFilters();
  selectedEventTypes: string[] = [];

  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private auditService: CustomerActivityAuditService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  load(): void {
    this.loading = true;
    const filters = this.buildFilters();
    this.auditService.search(filters, this.pageIndex, this.pageSize).subscribe({
      next: (page) => {
        this.rows = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.alertService.showError('Impossible de charger le journal d’activité.');
      },
    });
    this.auditService.summary(filters).subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {
        this.summary = null;
      },
    });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters = this.defaultFilters();
    this.selectedEventTypes = [];
    this.pageIndex = 0;
    this.load();
  }

  applyPreset(preset: 'errors24h' | 'authFail' | 'payments' | 'android'): void {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 3600 * 1000);
    this.filters = this.defaultFilters();
    this.selectedEventTypes = [];

    if (preset === 'errors24h') {
      this.filters.from = from.toISOString();
      this.filters.to = now.toISOString();
      this.filters.category = 'ERROR';
    } else if (preset === 'authFail') {
      this.filters.from = from.toISOString();
      this.filters.to = now.toISOString();
      this.selectedEventTypes = ['LOGIN_FAILED', 'OTP_FAILED', 'OTP_SEND_FAILED'];
    } else if (preset === 'payments') {
      this.filters.from = from.toISOString();
      this.filters.to = now.toISOString();
      this.filters.category = 'BUSINESS';
      this.selectedEventTypes = [
        'MM_PAYMENT_SUBMITTED',
        'MM_PAYMENT_FAILED',
        'ORDER_SUBMITTED',
        'ORDER_FAILED',
        'TONTINE_PAYMENT_SUBMITTED',
      ];
    } else if (preset === 'android') {
      this.filters.from = from.toISOString();
      this.filters.to = now.toISOString();
      this.filters.platform = 'android';
    }
    this.pageIndex = 0;
    this.load();
  }

  setRangePreset(range: 'today' | '24h' | '7d' | '30d'): void {
    const now = new Date();
    let from: Date;
    if (range === 'today') {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
    } else if (range === '24h') {
      from = new Date(now.getTime() - 24 * 3600 * 1000);
    } else if (range === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    } else {
      from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    }
    this.filters.from = from.toISOString();
    this.filters.to = now.toISOString();
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openDetail(row: CustomerActivityLog): void {
    this.selected = row;
    this.showSessionPanel = false;
    this.sessionEvents = [];
  }

  closeDetail(): void {
    this.selected = null;
    this.showSessionPanel = false;
    this.sessionEvents = [];
  }

  openSession(row: CustomerActivityLog): void {
    if (!row.sessionId) {
      this.alertService.showError('Aucune session associée à cet événement.');
      return;
    }
    this.selected = row;
    this.showSessionPanel = true;
    this.sessionLoading = true;
    this.auditService.sessionTimeline(row.sessionId, this.filters.from, this.filters.to).subscribe({
      next: (events) => {
        this.sessionEvents = events;
        this.sessionLoading = false;
      },
      error: () => {
        this.sessionLoading = false;
        this.alertService.showError('Impossible de charger la timeline de session.');
      },
    });
  }

  filterByDevice(row: CustomerActivityLog): void {
    if (!row.deviceId) {
      return;
    }
    this.filters.deviceId = row.deviceId;
    this.pageIndex = 0;
    this.closeDetail();
    this.load();
  }

  openClient(row: CustomerActivityLog): void {
    if (!row.clientId) {
      return;
    }
    this.router.navigate(['/client', row.clientId]);
  }

  copyText(value: string | null | undefined): void {
    if (!value) {
      return;
    }
    navigator.clipboard?.writeText(value).then(
      () => this.alertService.showSuccess('Copié dans le presse-papiers.'),
      () => this.alertService.showError('Copie impossible.')
    );
  }

  exportCsv(): void {
    const maxRows = 5000;
    const filters = this.buildFilters();
    this.loading = true;
    this.auditService.search(filters, 0, Math.min(maxRows, Math.max(this.totalElements, this.pageSize))).subscribe({
      next: (page) => {
        const rows = page.content ?? [];
        const truncated = (page.totalElements ?? 0) > rows.length;
        const csv = this.toCsv(rows);
        this.downloadCsv(csv, `journal-espace-client-${new Date().toISOString().slice(0, 10)}.csv`);
        this.loading = false;
        if (truncated) {
          this.alertService.showError(
            `Export limité à ${rows.length} lignes sur ${page.totalElements}. Affinez les filtres.`
          );
        } else {
          this.alertService.showSuccess(`Export de ${rows.length} événement(s).`);
        }
      },
      error: () => {
        this.loading = false;
        this.alertService.showError('Export impossible.');
      },
    });
  }

  categoryLabel(category: string | null | undefined): string {
    if (!category) {
      return '—';
    }
    return this.categoryLabels[category as AuditCategory] ?? category;
  }

  sourceLabel(source: string | null | undefined): string {
    if (!source) {
      return '—';
    }
    return this.sourceLabels[source as AuditSource] ?? source;
  }

  metadataJson(row: CustomerActivityLog): string {
    if (!row.metadata) {
      return '—';
    }
    try {
      return JSON.stringify(row.metadata, null, 2);
    } catch {
      return String(row.metadata);
    }
  }

  private buildFilters(): CustomerActivityLogFilters {
    return {
      ...this.filters,
      eventType: this.selectedEventTypes.length ? [...this.selectedEventTypes] : undefined,
      clientId: this.filters.clientId || null,
      httpStatus: this.filters.httpStatus || null,
    };
  }

  private defaultFilters(): CustomerActivityLogFilters {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 3600 * 1000);
    return {
      from: from.toISOString(),
      to: now.toISOString(),
      phone: '',
      deviceId: '',
      sessionId: '',
      category: '',
      source: '',
      platform: '',
      appVersion: '',
      q: '',
      outcome: '',
      clientId: null,
      httpStatus: null,
    };
  }

  private toCsv(rows: CustomerActivityLog[]): string {
    const headers = [
      'occurredAt',
      'source',
      'category',
      'eventType',
      'clientId',
      'phone',
      'platform',
      'appVersion',
      'screen',
      'message',
      'httpStatus',
      'eventId',
      'sessionId',
      'deviceId',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.occurredAt,
          row.source,
          row.category,
          row.eventType,
          row.clientId,
          row.phone,
          row.platform,
          row.appVersion,
          row.screen,
          row.message,
          row.httpStatus,
          row.eventId,
          row.sessionId,
          row.deviceId,
        ]
          .map(escape)
          .join(',')
      );
    }
    return lines.join('\n');
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
