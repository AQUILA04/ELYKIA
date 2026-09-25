import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { CommercialService } from 'src/app/commercial/service/commercial.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { SaleCancellationService } from '../service/sale-cancellation.service';
import {
  SaleCancellationExecuteRequest,
  SaleCancellationFilter,
  SaleCancellationPreview,
  SaleCancellationRun
} from '../models/sale-cancellation.model';

@Component({
  selector: 'app-sale-cancellation',
  templateUrl: './sale-cancellation.component.html',
  styleUrls: ['./sale-cancellation.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class SaleCancellationComponent implements OnInit, OnDestroy {

  runs: SaleCancellationRun[] = [];
  totalRuns = 0;
  currentPage = 0;
  pageSize = 10;
  loadingHistory = false;

  selectedRun: SaleCancellationRun | null = null;
  loadingDetails = false;

  showNewCancellationModal = false;
  commercials: any[] = [];
  loadingCommercials = false;

  filterForm: SaleCancellationFilter = {
    commercialUsername: '',
    startDate: '',
    endDate: '',
    creditStatus: null
  };

  minDateString = '';
  maxDateString = '';

  previewResult: SaleCancellationPreview | null = null;
  loadingPreview = false;
  /** Onglet actif de la simulation (segment custom, pas mat-tab). */
  simulationTab: 'eligible' | 'excluded' | 'stock' = 'eligible';

  cancellationReason = '';
  executing = false;
  downloadingFileId: number | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly cancellationService: SaleCancellationService,
    private readonly commercialService: CommercialService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initCurrentMonthDates();
    this.loadHistory();
    this.loadCommercials();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  private initCurrentMonthDates(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    this.minDateString = this.formatDate(firstDay);

    const lastDay = new Date(year, month + 1, 0);
    this.maxDateString = this.formatDate(lastDay);

    this.filterForm.startDate = this.minDateString;
    this.filterForm.endDate = this.formatDate(now);
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadCommercials(): void {
    this.loadingCommercials = true;
    this.commercialService.getCommercials(0, 1000).subscribe({
      next: (res: any) => {
        this.loadingCommercials = false;
        const payload = res?.data ?? res;
        if (payload?.content) {
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

  loadHistory(): void {
    this.loadingHistory = true;
    this.cancellationService.getRuns(this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.loadingHistory = false;
        if (res && res.content) {
          this.runs = res.content;
          this.totalRuns = res.totalElements || 0;
        } else if (Array.isArray(res)) {
          this.runs = res;
          this.totalRuns = res.length;
        }
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loadingHistory = false;
        this.alertService.showError(
          'Impossible de charger l\'historique des annulations.',
          'Erreur'
        );
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHistory();
  }

  openRunDetails(run: SaleCancellationRun): void {
    this.loadingDetails = true;
    this.selectedRun = null;
    this.cancellationService.getRunDetails(run.id).subscribe({
      next: (details) => {
        this.loadingDetails = false;
        this.selectedRun = details;
      },
      error: () => {
        this.loadingDetails = false;
        this.alertService.showError(
          'Impossible de récupérer le détail de cette opération.',
          'Erreur'
        );
      }
    });
  }

  closeRunDetails(): void {
    this.selectedRun = null;
  }

  openNewCancellation(): void {
    this.showNewCancellationModal = true;
    this.previewResult = null;
    this.cancellationReason = '';
    this.simulationTab = 'eligible';
  }

  closeNewCancellation(): void {
    this.showNewCancellationModal = false;
    this.previewResult = null;
    this.cancellationReason = '';
    this.simulationTab = 'eligible';
  }

  onSimulate(): void {
    if (!this.filterForm.commercialUsername) {
      this.alertService.showWarning('Veuillez sélectionner un commercial.', 'Attention');
      return;
    }
    if (!this.filterForm.startDate || !this.filterForm.endDate) {
      this.alertService.showWarning(
        'Veuillez renseigner les dates de début et de fin.',
        'Attention'
      );
      return;
    }

    this.loadingPreview = true;
    this.previewResult = null;
    this.simulationTab = 'eligible';

    this.cancellationService.preview(this.filterForm).subscribe({
      next: (preview) => {
        this.loadingPreview = false;
        this.previewResult = preview;
        if (preview.totalSalesFound === 0) {
          this.alertService.showInfo(
            'Aucune vente trouvée pour cette période et ce commercial.',
            'Information'
          );
        }
      },
      error: (err) => {
        this.loadingPreview = false;
        const msg = err?.error?.message || 'Erreur lors de la simulation.';
        this.alertService.showError(msg, 'Erreur de simulation');
      }
    });
  }

  onConfirmExecution(): void {
    if (!this.previewResult || this.previewResult.eligibleCount === 0) {
      this.alertService.showWarning('Aucune vente éligible à annuler.', 'Action impossible');
      return;
    }

    if (!this.cancellationReason.trim()) {
      this.alertService.showWarning(
        'Veuillez saisir obligatoirement un motif d\'audit pour confirmer.',
        'Motif requis'
      );
      return;
    }

    const excludedNote = this.previewResult.excludedCount > 0
      ? `<li style="color: #c75000;"><b>${this.previewResult.excludedCount} vente(s) avec paiements perçus seront préservées et non annulées.</b></li>`
      : '';

    const html = `
      Vous êtes sur le point d'annuler <b>${this.previewResult.eligibleCount} vente(s)</b>
      pour un montant total de <b>${this.previewResult.eligibleAmount.toLocaleString()} FCFA</b>.<br><br>
      <ul style="text-align: left; font-size: 13px;">
        <li>Le stock sera réintégré dans le stock du commercial du mois en cours.</li>
        <li>Les rapports journaliers des dates d'opération seront décrémentés.</li>
        <li>Des fiches d'audit PDF seront générées et archivées sur MinIO.</li>
        ${excludedNote}
      </ul>
    `;

    this.alertService
      .showConfirmation(
        'Confirmer l\'annulation ?',
        html,
        'Oui, exécuter l\'annulation',
        'Annuler'
      )
      .then((confirmed) => {
        if (confirmed) {
          this.executeCancellation();
        }
      });
  }

  private executeCancellation(): void {
    const request: SaleCancellationExecuteRequest = {
      commercialUsername: this.filterForm.commercialUsername,
      startDate: this.filterForm.startDate,
      endDate: this.filterForm.endDate,
      creditStatus: this.filterForm.creditStatus,
      cancellationReason: this.cancellationReason,
      eligibleCreditIds: this.previewResult?.eligibleSales?.map(s => s.creditId) ?? []
    };

    this.executing = true;
    this.cancellationService.execute(request).subscribe({
      next: (run) => {
        this.executing = false;
        if (run.status !== 'COMPLETED') {
          this.alertService.showError(
            run.errorMessage || 'L\'opération n\'a pas abouti.',
            'Erreur d\'annulation'
          );
          this.loadHistory();
          return;
        }
        this.closeNewCancellation();
        this.loadHistory();

        this.alertService.showSuccess(
          `
            L'opération s'est terminée avec succès.<br>
            - <b>${run.cancelledSalesCount}</b> vente(s) annulée(s)<br>
            - <b>${run.excludedSalesCount}</b> vente(s) rejetée(s) pour recouvrements<br>
            - <b>${run.pdfFileCount}</b> pièce(s) d'audit archivée(s)
          `,
          'Annulation réussie'
        );
      },
      error: (err) => {
        this.executing = false;
        const msg = err?.error?.message || 'Erreur lors de l\'exécution de l\'annulation.';
        this.alertService.showError(msg, 'Erreur d\'annulation');
      }
    });
  }

  downloadFile(fileId: number, fileName: string): void {
    this.downloadingFileId = fileId;
    this.cancellationService.downloadFile(fileId).subscribe({
      next: (blob) => {
        this.downloadingFileId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingFileId = null;
        this.alertService.showError(
          'Impossible de télécharger la pièce d\'audit.',
          'Erreur'
        );
      }
    });
  }
}
