import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { CommercialService } from '@features/commercial/service/commercial.service';
import { AlertService } from '@shared/service/alert.service';
import { SaleCancellationService } from '../service/sale-cancellation.service';
import {
  EligibleSaleItem,
  SaleCancellationExecuteRequest,
  SaleCancellationFilter,
  SaleCancellationPreview,
  SaleCancellationRun,
  StockImpactItem
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

  /** Filtres de l'historique (archives). */
  historySearch = '';
  historyCommercial: string | null = null;
  historyStartDate = '';
  historyEndDate = '';

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

  selectedCreditIds = new Set<number>();
  selectedCount = 0;
  selectedAmount = 0;
  selectedStockImpacts: StockImpactItem[] = [];

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
    this.cancellationService.getRuns(this.currentPage, this.pageSize, {
      commercialUsername: this.historyCommercial,
      startDate: this.historyStartDate || null,
      endDate: this.historyEndDate || null,
      search: this.historySearch
    }).subscribe({
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
      error: (err) => {
        this.loadingHistory = false;
        const msg = err?.error?.message
          || 'Impossible de charger l\'historique des annulations.';
        this.alertService.showError(msg, 'Erreur');
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHistory();
  }

  onHistoryCommercialSelected(username: string | null): void {
    this.historyCommercial = username;
    this.currentPage = 0;
    this.loadHistory();
  }

  onHistorySearch(): void {
    this.currentPage = 0;
    this.loadHistory();
  }

  applyHistoryPeriod(): void {
    if (this.historyStartDate && this.historyEndDate
        && this.historyStartDate > this.historyEndDate) {
      this.alertService.showWarning(
        'La date de début ne peut pas être postérieure à la date de fin.',
        'Période invalide'
      );
      return;
    }
    this.currentPage = 0;
    this.loadHistory();
  }

  resetHistoryFilters(): void {
    this.historySearch = '';
    this.historyCommercial = null;
    this.historyStartDate = '';
    this.historyEndDate = '';
    this.currentPage = 0;
    this.loadHistory();
  }

  get hasActiveHistoryFilters(): boolean {
    return !!(
      this.historySearch?.trim()
      || this.historyCommercial
      || this.historyStartDate
      || this.historyEndDate
    );
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
    this.setSelection([]);
  }

  closeNewCancellation(): void {
    this.showNewCancellationModal = false;
    this.previewResult = null;
    this.cancellationReason = '';
    this.simulationTab = 'eligible';
    this.setSelection([]);
  }

  get eligibleSales(): EligibleSaleItem[] {
    return this.previewResult?.eligibleSales ?? [];
  }

  get allSalesSelected(): boolean {
    return this.eligibleSales.length > 0 && this.selectedCount === this.eligibleSales.length;
  }

  get someSalesSelected(): boolean {
    return this.selectedCount > 0 && !this.allSalesSelected;
  }

  isSaleSelected(creditId: number): boolean {
    return this.selectedCreditIds.has(creditId);
  }

  toggleSale(creditId: number, checked: boolean): void {
    const ids = new Set(this.selectedCreditIds);
    if (checked) {
      ids.add(creditId);
    } else {
      ids.delete(creditId);
    }
    this.setSelection(Array.from(ids));
  }

  toggleAllSales(checked: boolean): void {
    this.setSelection(checked ? this.eligibleSales.map(s => s.creditId) : []);
  }

  private setSelection(creditIds: number[]): void {
    this.selectedCreditIds = new Set(creditIds);
    const selected = this.eligibleSales.filter(s => this.selectedCreditIds.has(s.creditId));
    this.selectedCount = selected.length;
    this.selectedAmount = selected.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    const impacts = new Map<number, StockImpactItem>();
    for (const sale of selected) {
      for (const art of sale.articles ?? []) {
        const current = impacts.get(art.articleId);
        if (current) {
          current.quantityToReturn += art.quantityToReturn;
        } else {
          impacts.set(art.articleId, { ...art });
        }
      }
    }
    this.selectedStockImpacts = Array.from(impacts.values());
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
    this.setSelection([]);

    this.cancellationService.preview(this.filterForm).subscribe({
      next: (preview) => {
        this.loadingPreview = false;
        this.previewResult = preview;
        this.setSelection(preview.eligibleSales.map(s => s.creditId));
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

    if (this.selectedCount === 0) {
      this.alertService.showWarning(
        'Cochez au moins une vente à annuler dans l\'onglet « Ventes éligibles ».',
        'Aucune vente sélectionnée'
      );
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

    const unselectedCount = this.previewResult.eligibleCount - this.selectedCount;
    const unselectedNote = unselectedCount > 0
      ? `<li>${unselectedCount} vente(s) éligible(s) non cochée(s) resteront inchangées.</li>`
      : '';

    const html = `
      Vous êtes sur le point d'annuler <b>${this.selectedCount} vente(s)</b>
      pour un montant total de <b>${this.selectedAmount.toLocaleString()} FCFA</b>.<br><br>
      <ul style="text-align: left; font-size: 13px;">
        <li>Une vente du mois en cours revient dans le stock de ce mois, et le rapport de son jour est corrigé.</li>
        <li>Un rattrapage enregistré ce mois-ci revient dans le stock du mois concerné.</li>
        <li>Des fiches d'audit PDF seront générées et archivées.</li>
        ${unselectedNote}
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
      eligibleCreditIds: this.eligibleSales
        .filter(s => this.selectedCreditIds.has(s.creditId))
        .map(s => s.creditId)
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
          [
            "L'opération s'est terminée avec succès.",
            `• ${run.cancelledSalesCount} vente(s) annulée(s)`,
            `• ${run.excludedSalesCount} vente(s) rejetée(s) pour recouvrements`,
            `• ${run.pdfFileCount} pièce(s) d'audit archivée(s)`,
          ].join('\n'),
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
