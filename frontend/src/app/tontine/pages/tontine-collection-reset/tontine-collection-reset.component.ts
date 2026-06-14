import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  TontineCollectionResetFileDto,
  TontineCollectionResetRunResult,
  TontineCollectionResetService,
  TontineCollectionResetYearNode
} from '../../services/tontine-collection-reset.service';

interface ResetKpis {
  totalYears: number;
  totalRuns: number;
  totalFiles: number;
  latestLabel: string;
}

@Component({
  selector: 'app-tontine-collection-reset',
  templateUrl: './tontine-collection-reset.component.html',
  styleUrls: ['./tontine-collection-reset.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TontineCollectionResetComponent implements OnInit, OnDestroy {
  tree: TontineCollectionResetYearNode[] = [];
  loading = false;
  exporting = false;
  resetting = false;
  resetPending = false;
  downloadingFileId: number | null = null;
  currentDate = new Date();
  lastUpdate = new Date();
  kpis: ResetKpis = {
    totalYears: 0,
    totalRuns: 0,
    totalFiles: 0,
    latestLabel: '—'
  };

  expandedYears = new Set<number>();
  expandedRuns = new Set<number>();

  private clockInterval?: ReturnType<typeof setInterval>;

  get isProcessing(): boolean {
    return this.exporting || this.resetting || this.resetPending;
  }

  constructor(
    private readonly resetService: TontineCollectionResetService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadTree();
    this.clockInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  refresh(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading = true;
    this.resetService.getArchiveTree().subscribe({
      next: (data: TontineCollectionResetYearNode[]) => {
        this.tree = data ?? [];
        this.computeKpis();
        this.expandDefaults();
        this.lastUpdate = new Date();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  exportOnly(): void {
    if (this.isProcessing) {
      return;
    }
    this.exporting = true;
    this.resetService.triggerExportOnly().subscribe({
      next: (result: TontineCollectionResetRunResult) => {
        this.exporting = false;
        this.alertService.showSuccess(
          `Archivage terminé : ${result.pdfFileCount} PDF généré(s) pour ${result.collectionsCount} collecte(s).`
        );
        this.loadTree();
      },
      error: (err: { error?: { message?: string } }) => {
        this.exporting = false;
        this.alertService.showError(err?.error?.message || 'Erreur lors de l\'archivage des collectes.');
      }
    });
  }

  triggerReset(): void {
    if (this.isProcessing) {
      return;
    }
    this.resetPending = true;
    this.alertService.showConfirmation(
      'Réinitialiser les collectes tontine',
      'Cette action va d\'abord archiver toutes les collectes en PDF (groupées par commercial et quartier), puis remettre à zéro toutes les contributions de la session en cours. Les membres seront conservés. Continuer ?',
      'Archiver et réinitialiser',
      'Annuler'
    ).then((confirmed) => {
      this.resetPending = false;
      if (!confirmed) {
        return;
      }
      this.resetting = true;
      this.resetService.triggerReset().subscribe({
        next: (result: TontineCollectionResetRunResult) => {
          this.resetting = false;
          if (result.status === 'FAILED') {
            this.alertService.showError(result.errorMessage || 'La réinitialisation a échoué.');
          } else {
            this.alertService.showSuccess(
              `Réinitialisation terminée : ${result.pdfFileCount} PDF archivé(s), ${result.membersResetCount} membre(s) remis à zéro.`
            );
          }
          this.loadTree();
        },
        error: (err: { error?: { message?: string } }) => {
          this.resetting = false;
          this.alertService.showError(err?.error?.message || 'Erreur lors de la réinitialisation.');
        }
      });
    });
  }

  download(file: TontineCollectionResetFileDto): void {
    if (this.downloadingFileId !== null) {
      return;
    }
    this.downloadingFileId = file.id;
    this.resetService.download(file.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.fileName || 'collectes-tontine.pdf';
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.downloadingFileId = null;
      },
      error: () => {
        this.alertService.showError('Erreur lors du téléchargement du PDF.');
        this.downloadingFileId = null;
      }
    });
  }

  isDownloading(fileId: number): boolean {
    return this.downloadingFileId === fileId;
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears.has(year);
  }

  isRunExpanded(runId: number): boolean {
    return this.expandedRuns.has(runId);
  }

  toggleYear(year: number): void {
    if (this.expandedYears.has(year)) {
      this.expandedYears.delete(year);
    } else {
      this.expandedYears.add(year);
    }
  }

  toggleRun(runId: number): void {
    if (this.expandedRuns.has(runId)) {
      this.expandedRuns.delete(runId);
    } else {
      this.expandedRuns.add(runId);
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'Terminé';
      case 'FAILED': return 'Échec';
      case 'ARCHIVING': return 'Archivage';
      case 'RESETTING': return 'Réinitialisation';
      default: return status;
    }
  }

  formatAmount(amount: number | undefined): string {
    return (amount ?? 0).toLocaleString('fr-FR') + ' FCFA';
  }

  private computeKpis(): void {
    let totalRuns = 0;
    let totalFiles = 0;
    let latestLabel = '—';

    for (const yearNode of this.tree) {
      totalRuns += yearNode.runs?.length ?? 0;
      for (const run of yearNode.runs ?? []) {
        totalFiles += run.files?.length ?? 0;
      }
    }

    const firstYear = this.tree[0];
    const firstRun = firstYear?.runs?.[0];
    if (firstYear && firstRun) {
      latestLabel = `Session ${firstYear.year} · ${this.statusLabel(firstRun.status)}`;
    }

    this.kpis = {
      totalYears: this.tree.length,
      totalRuns,
      totalFiles,
      latestLabel
    };
  }

  private expandDefaults(): void {
    if (this.tree.length > 0) {
      this.expandedYears.add(this.tree[0].year);
      const firstRun = this.tree[0].runs?.[0];
      if (firstRun) {
        this.expandedRuns.add(firstRun.runId);
      }
    }
  }
}
