import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { CommercialService } from 'src/app/commercial/service/commercial.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  TontineCollectionResetFileDto,
  TontineCollectionResetRunNode,
  TontineCollectionResetRunResult,
  TontineCollectionResetService,
  TontineCollectionResetYearNode,
  TontineCommercialVoidPreview,
  TontineResetLine,
  TontineResetMember,
  TontineResetReportDay
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
  canVoid = false;
  loadingCommercials = false;
  previewing = false;
  voiding = false;
  commercials: Array<{ username: string; firstname?: string; lastname?: string }> = [];
  commercialUsername = '';
  sessionYear = new Date().getFullYear();
  preview: TontineCommercialVoidPreview | null = null;
  detailTab: 'lines' | 'members' | 'days' = 'lines';
  detailRunId: number | null = null;
  detailLoading = false;
  exportingCsv = false;
  lines: TontineResetLine[] = [];
  linesPage = 0;
  linesTotal = 0;
  readonly linesPageSize = 20;
  members: TontineResetMember[] = [];
  reportDays: TontineResetReportDay[] = [];
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
    return this.exporting || this.resetting || this.resetPending || this.previewing || this.voiding;
  }

  constructor(
    private readonly resetService: TontineCollectionResetService,
    private readonly alertService: AlertService,
    private readonly commercialService: CommercialService,
    private readonly permissions: NgxPermissionsService
  ) {}

  ngOnInit(): void {
    this.loadTree();
    Promise.all([
      this.permissions.hasPermission('ROLE_RESET_TONTINE_COLLECTIONS'),
      this.permissions.hasPermission('ROLE_ADMIN')
    ]).then(([reset, admin]) => {
      this.canVoid = !!(reset || admin);
      if (this.canVoid) {
        this.loadCommercials();
      }
    });
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

  commercialLabel(commercial: { username: string; firstname?: string; lastname?: string }): string {
    const name = [commercial.firstname, commercial.lastname].filter(Boolean).join(' ');
    return name ? `${commercial.username} — ${name}` : commercial.username;
  }

  onCommercialChange(): void {
    this.preview = null;
  }

  onYearChange(): void {
    this.preview = null;
  }

  pagesCount(): number {
    return Math.max(1, Math.ceil(this.linesTotal / this.linesPageSize));
  }

  loadPreview(): void {
    if (!this.commercialUsername || this.isProcessing) {
      return;
    }
    this.sessionYear = Number(this.sessionYear);
    this.previewing = true;
    this.resetService.previewCommercial(this.commercialUsername, this.sessionYear).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.previewing = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.preview = null;
        this.previewing = false;
        this.alertService.showError(err?.error?.message || 'Impossible de calculer l\'aperçu.');
      }
    });
  }

  confirmVoid(): void {
    if (!this.preview || this.isProcessing) {
      return;
    }
    const preview = this.preview;
    const text = [
      `Vous allez annuler ${preview.collectionsCount} collecte(s) de ${preview.commercialUsername} pour la session ${preview.sessionYear}, soit ${this.formatAmount(preview.collectionsAmount)}.`,
      `${preview.membersWithOtherCollections} membre(s) gardent les collectes des autres commerciaux (${this.formatAmount(preview.preservedAmount)} conservés).`,
      preview.deliveryCollectionsCount
        ? `${preview.deliveryCollectionsCount} ligne(s) liées à une livraison sont incluses. Les livraisons de marchandises ne sont pas annulées.`
        : 'Les livraisons de marchandises ne sont pas annulées.',
      'Les versements déjà remis ne sont pas repris. Une archive est conservée pour le rapprochement.'
    ].join(' ');
    this.alertService.showConfirmation(
      'Annuler les collectes de ce commercial',
      text,
      'Annuler ces collectes',
      'Revenir'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.voiding = true;
      this.resetService.voidCommercial(preview.commercialUsername, preview.sessionYear).subscribe({
        next: (result) => {
          this.voiding = false;
          if (result.status === 'FAILED') {
            this.alertService.showError(result.errorMessage || 'L\'annulation a échoué.');
          } else {
            this.alertService.showSuccess(
              `Annulation terminée : ${result.collectionsCount} collecte(s), ${result.membersResetCount} membre(s) recalculé(s).`
            );
            this.preview = null;
          }
          this.loadTree();
        },
        error: (err: { error?: { message?: string } }) => {
          this.voiding = false;
          this.alertService.showError(err?.error?.message || 'Erreur lors de l\'annulation.');
        }
      });
    });
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

  toggleRun(run: TontineCollectionResetRunNode): void {
    if (this.expandedRuns.has(run.runId)) {
      this.expandedRuns.delete(run.runId);
      return;
    }
    this.expandedRuns.add(run.runId);
    if (run.scope === 'COMMERCIAL') {
      this.openDetail(run.runId);
    }
  }

  isCommercialRun(run: TontineCollectionResetRunNode): boolean {
    return run.scope === 'COMMERCIAL';
  }

  openDetail(runId: number): void {
    this.detailRunId = runId;
    this.detailTab = 'lines';
    this.linesPage = 0;
    this.loadLines();
    this.loadMembers();
    this.loadReportDays();
  }

  showTab(tab: 'lines' | 'members' | 'days'): void {
    this.detailTab = tab;
  }

  previousLines(): void {
    if (this.linesPage === 0 || this.detailRunId === null) {
      return;
    }
    this.linesPage -= 1;
    this.loadLines();
  }

  nextLines(): void {
    if (this.detailRunId === null || (this.linesPage + 1) * this.linesPageSize >= this.linesTotal) {
      return;
    }
    this.linesPage += 1;
    this.loadLines();
  }

  downloadCsv(runId: number): void {
    if (this.exportingCsv) {
      return;
    }
    this.exportingCsv = true;
    this.resetService.downloadLinesCsv(runId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `collectes-annulees-${runId}.csv`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.exportingCsv = false;
      },
      error: () => {
        this.exportingCsv = false;
        this.alertService.showError('Erreur lors de l\'export.');
      }
    });
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

  private loadCommercials(): void {
    this.loadingCommercials = true;
    this.commercialService.getCommercials(0, 1000).subscribe({
      next: (res: { data?: { content?: typeof this.commercials }; content?: typeof this.commercials }) => {
        this.loadingCommercials = false;
        const payload = res?.data ?? res;
        if (payload && 'content' in payload && Array.isArray(payload.content)) {
          this.commercials = payload.content;
        } else if (Array.isArray(payload)) {
          this.commercials = payload;
        }
      },
      error: () => {
        this.loadingCommercials = false;
      }
    });
  }

  private loadLines(): void {
    if (this.detailRunId === null) {
      return;
    }
    this.detailLoading = true;
    this.resetService.getLines(this.detailRunId, this.linesPage, this.linesPageSize).subscribe({
      next: (page) => {
        this.lines = page?.content ?? [];
        this.linesTotal = page?.totalElements ?? 0;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.alertService.showError('Impossible de charger les lignes archivées.');
      }
    });
  }

  private loadMembers(): void {
    if (this.detailRunId === null) {
      return;
    }
    this.resetService.getMembers(this.detailRunId, 0, 100).subscribe({
      next: (page) => {
        this.members = page?.content ?? [];
      },
      error: () => {
        this.members = [];
      }
    });
  }

  private loadReportDays(): void {
    if (this.detailRunId === null) {
      return;
    }
    this.resetService.getReportDays(this.detailRunId).subscribe({
      next: (days) => {
        this.reportDays = days ?? [];
      },
      error: () => {
        this.reportDays = [];
      }
    });
  }

  private expandDefaults(): void {
    if (this.tree.length > 0) {
      this.expandedYears.add(this.tree[0].year);
      const firstRun = this.tree[0].runs?.[0];
      if (firstRun) {
        this.expandedRuns.add(firstRun.runId);
        if (firstRun.scope === 'COMMERCIAL') {
          this.openDetail(firstRun.runId);
        }
      }
    }
  }
}
