import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  AllocationMigrationAdminService, MigrationFailure, MigrationRun
} from './allocation-migration-admin.service';

@Component({
  selector: 'app-allocation-migration-admin',
  templateUrl: './allocation-migration-admin.component.html',
  styleUrls: ['./allocation-migration-admin.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AllocationMigrationAdminComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  lastUpdate = new Date();
  runs: MigrationRun[] = [];
  runsPage = 0;
  runsTotalPages = 0;
  selected: MigrationRun | null = null;
  failures: MigrationFailure[] = [];
  failuresPage = 0;
  failuresTotalPages = 0;
  failuresTotal = 0;
  openedFailure: MigrationFailure | null = null;
  loading = false;
  actionBusy = false;

  private readonly pageSize = 10;
  private readonly failuresPageSize = 20;
  private clock?: ReturnType<typeof setInterval>;
  private poll?: Subscription;

  constructor(
    private readonly api: AllocationMigrationAdminService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.clock = setInterval(() => (this.currentDate = new Date()), 1000);
    this.loadRuns(true);
    this.poll = interval(5000).subscribe(() => this.refreshActive());
  }

  ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
    this.poll?.unsubscribe();
  }

  refresh(): void {
    this.loadRuns();
    this.loadFailures();
  }

  loadRuns(selectLatest = false): void {
    this.loading = true;
    this.api.listRuns(this.runsPage, this.pageSize).subscribe({
      next: page => {
        this.runs = page.content;
        this.runsTotalPages = page.totalPages;
        this.loading = false;
        this.lastUpdate = new Date();
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
        this.alertService.toastError('Impossible de charger les recalculs.');
      }
    });
  }

  select(run: MigrationRun): void {
    this.selected = run;
    this.failuresPage = 0;
    this.openedFailure = null;
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
      error: () => this.alertService.toastError('Impossible de charger les erreurs.')
    });
  }

  /** Rafraîchit automatiquement tant qu'un recalcul est actif. */
  private refreshActive(): void {
    if (this.anyRunning || this.selected?.running) {
      this.loadRuns();
      this.loadFailures();
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

  openFailure(failure: MigrationFailure): void {
    this.openedFailure = failure;
  }

  closeFailure(): void {
    this.openedFailure = null;
  }

  retry(): void {
    if (this.selected) {
      this.retryRun(this.selected);
    }
  }

  retryRun(run: MigrationRun): void {
    if (run.status !== 'FAILED') {
      return;
    }
    this.alertService
      .showConfirmation('Relancer le recalcul',
        `Reprendre le recalcul #${run.id} là où il s'est arrêté ?`, 'Relancer', 'Annuler')
      .then(confirmed => {
        if (confirmed) {
          this.runAction(this.api.retry(run.id), 'Reprise du recalcul lancée.');
        }
      });
  }

  startFull(): void {
    this.alertService
      .showConfirmation('Recalcul complet',
        'Lancer un recalcul complet des parts société de tous les membres actifs ? Les opérations tontine seront suspendues pendant l\'exécution.',
        'Lancer', 'Annuler')
      .then(confirmed => {
        if (confirmed) {
          this.runAction(this.api.startFullRecalculation(), 'Recalcul complet lancé.');
        }
      });
  }

  private runAction(action: Observable<unknown>, successMessage: string): void {
    this.actionBusy = true;
    action.subscribe({
      next: () => {
        this.actionBusy = false;
        this.alertService.toastSuccess(successMessage);
        this.runsPage = 0;
        this.loadRuns(true);
      },
      error: err => {
        this.actionBusy = false;
        this.alertService.toastError(err?.error?.message ?? 'Action impossible.');
      }
    });
  }

  progress(run: MigrationRun): number {
    return run.totalMembers > 0 ? Math.min(100, Math.round((run.processedMembers / run.totalMembers) * 100)) : 0;
  }

  statusKpiClass(run: MigrationRun): string {
    switch (run.status) {
      case 'COMPLETED': return 'kpi-green';
      case 'FAILED': return 'kpi-delai';
      default: return 'kpi-total';
    }
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
