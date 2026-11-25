import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import {
  AllocationMigrationAdminService, MigrationFailure, MigrationRun
} from './allocation-migration-admin.service';

@Component({
  selector: 'app-allocation-migration-admin',
  templateUrl: './allocation-migration-admin.component.html',
  styleUrls: ['./allocation-migration-admin.component.scss']
})
export class AllocationMigrationAdminComponent implements OnInit, OnDestroy {
  runs: MigrationRun[] = [];
  runsPage = 0;
  runsTotalPages = 0;
  selected: MigrationRun | null = null;
  failures: MigrationFailure[] = [];
  failuresPage = 0;
  failuresTotalPages = 0;
  failuresTotal = 0;
  expandedFailureId: number | null = null;
  loading = false;
  actionBusy = false;
  error: string | null = null;
  info: string | null = null;

  private readonly pageSize = 10;
  private readonly failuresPageSize = 20;
  private poll?: Subscription;

  constructor(private readonly api: AllocationMigrationAdminService) {}

  ngOnInit(): void {
    this.loadRuns(true);
    this.poll = interval(5000).subscribe(() => this.refreshActive());
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  loadRuns(selectLatest = false): void {
    this.loading = true;
    this.api.listRuns(this.runsPage, this.pageSize).subscribe({
      next: page => {
        this.runs = page.content;
        this.runsTotalPages = page.totalPages;
        this.loading = false;
        if (selectLatest && this.runs.length) {
          this.select(this.runs[0]);
        } else if (this.selected) {
          const fresh = this.runs.find(r => r.id === this.selected!.id);
          if (fresh) {
            this.selected = fresh;
          }
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les recalculs.';
      }
    });
  }

  select(run: MigrationRun): void {
    this.selected = run;
    this.failuresPage = 0;
    this.expandedFailureId = null;
    this.loadFailures();
  }

  loadFailures(): void {
    if (!this.selected) {
      return;
    }
    this.api.listFailures(this.selected.id, this.failuresPage, this.failuresPageSize).subscribe({
      next: page => {
        this.failures = page.content;
        this.failuresTotalPages = page.totalPages;
        this.failuresTotal = page.totalElements;
      },
      error: () => (this.error = 'Impossible de charger les erreurs.')
    });
  }

  /** Rafraîchit automatiquement tant qu'un recalcul est actif. */
  private refreshActive(): void {
    if (this.runs.some(r => r.running) || this.selected?.running) {
      this.loadRuns();
      if (this.selected) {
        this.loadFailures();
      }
    }
  }

  pageFailures(delta: number): void {
    this.failuresPage = Math.max(0, Math.min(this.failuresTotalPages - 1, this.failuresPage + delta));
    this.loadFailures();
  }

  pageRuns(delta: number): void {
    this.runsPage = Math.max(0, Math.min(this.runsTotalPages - 1, this.runsPage + delta));
    this.loadRuns();
  }

  toggle(failure: MigrationFailure): void {
    this.expandedFailureId = this.expandedFailureId === failure.id ? null : failure.id;
  }

  retry(): void {
    if (!this.selected || this.selected.status !== 'FAILED') {
      return;
    }
    this.runAction(this.api.retry(this.selected.id), 'Reprise du recalcul lancée.');
  }

  startFull(): void {
    if (!confirm('Lancer un recalcul complet des parts société de tous les membres actifs ?')) {
      return;
    }
    this.runAction(this.api.startFullRecalculation(), 'Recalcul complet lancé.');
  }

  private runAction(action: Observable<unknown>, successMessage: string): void {
    this.actionBusy = true;
    this.error = null;
    this.info = null;
    action.subscribe({
      next: () => {
        this.actionBusy = false;
        this.info = successMessage;
        this.runsPage = 0;
        this.loadRuns(true);
      },
      error: err => {
        this.actionBusy = false;
        this.error = err?.error?.message ?? 'Action impossible.';
      }
    });
  }

  progress(run: MigrationRun): number {
    return run.totalMembers > 0 ? Math.min(100, Math.round((run.processedMembers / run.totalMembers) * 100)) : 0;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'RUNNING': return 'En cours';
      case 'COMPLETED': return 'Terminé';
      case 'FAILED': return 'Échoué';
      default: return status;
    }
  }

  get anyRunning(): boolean {
    return this.runs.some(r => r.running);
  }
}
