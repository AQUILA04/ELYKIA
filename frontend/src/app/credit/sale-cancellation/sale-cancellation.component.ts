import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import Swal from 'sweetalert2';
import { CommercialService } from 'src/app/commercial/service/commercial.service';
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
export class SaleCancellationComponent implements OnInit {

  // Données de l'historique
  runs: SaleCancellationRun[] = [];
  totalRuns = 0;
  currentPage = 0;
  pageSize = 10;
  loadingHistory = false;

  // Détails d'un run sélectionné (modal de consultation)
  selectedRun: SaleCancellationRun | null = null;
  loadingDetails = false;

  // Modal / Panneau Nouvelle Annulation (ADMIN uniquement)
  showNewCancellationModal = false;
  commercials: any[] = [];
  loadingCommercials = false;

  // Filtres de simulation
  filterForm: SaleCancellationFilter = {
    commercialUsername: '',
    startDate: '',
    endDate: '',
    creditStatus: null
  };

  // Contraintes de dates du mois en cours
  minDateString: string = '';
  maxDateString: string = '';

  // Résultat de simulation (Dry-Run)
  previewResult: SaleCancellationPreview | null = null;
  loadingPreview = false;

  // Exécution
  cancellationReason = '';
  executing = false;
  downloadingFileId: number | null = null;

  constructor(
    private readonly cancellationService: SaleCancellationService,
    private readonly commercialService: CommercialService
  ) {}

  ngOnInit(): void {
    this.initCurrentMonthDates();
    this.loadHistory();
    this.loadCommercials();
  }

  private initCurrentMonthDates(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // 1er jour du mois courant
    const firstDay = new Date(year, month, 1);
    this.minDateString = this.formatDate(firstDay);

    // Dernier jour du mois courant
    const lastDay = new Date(year, month + 1, 0);
    this.maxDateString = this.formatDate(lastDay);

    // Par défaut : du 1er au jour actuel
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
        if (res && res.content) {
          this.commercials = res.content;
        } else if (Array.isArray(res)) {
          this.commercials = res;
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
      },
      error: () => {
        this.loadingHistory = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger l\'historique des annulations.'
        });
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
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de récupérer le détail de cette opération.'
        });
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
  }

  closeNewCancellation(): void {
    this.showNewCancellationModal = false;
    this.previewResult = null;
    this.cancellationReason = '';
  }

  onSimulate(): void {
    if (!this.filterForm.commercialUsername) {
      Swal.fire('Attention', 'Veuillez sélectionner un commercial.', 'warning');
      return;
    }
    if (!this.filterForm.startDate || !this.filterForm.endDate) {
      Swal.fire('Attention', 'Veuillez renseigner les dates de début et de fin.', 'warning');
      return;
    }

    this.loadingPreview = true;
    this.previewResult = null;

    this.cancellationService.preview(this.filterForm).subscribe({
      next: (preview) => {
        this.loadingPreview = false;
        this.previewResult = preview;
        if (preview.totalSalesFound === 0) {
          Swal.fire('Information', 'Aucune vente trouvée pour cette période et ce commercial.', 'info');
        }
      },
      error: (err) => {
        this.loadingPreview = false;
        const msg = err?.error?.message || 'Erreur lors de la simulation.';
        Swal.fire('Erreur de simulation', msg, 'error');
      }
    });
  }

  onConfirmExecution(): void {
    if (!this.previewResult || this.previewResult.eligibleCount === 0) {
      Swal.fire('Action impossible', 'Aucune vente éligible à annuler.', 'warning');
      return;
    }

    if (!this.cancellationReason.trim()) {
      Swal.fire('Motif requis', 'Veuillez saisir obligatoirement un motif d\'audit pour confirmer.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Confirmer l\'annulation ?',
      html: `
        Vous êtes sur le point d'annuler <b>${this.previewResult.eligibleCount} vente(s)</b> 
        pour un montant total de <b>${this.previewResult.eligibleAmount.toLocaleString()} FCFA</b>.<br><br>
        <ul style="text-align: left; font-size: 13px;">
          <li>Le stock sera réintégré dans le stock du commercial du mois en cours.</li>
          <li>Les rapports journaliers des dates d'opération seront décrémentés.</li>
          <li>Des fiches d'audit PDF seront générées et archivées sur MinIO.</li>
          ${this.previewResult.excludedCount > 0 ? `<li style="color: #d35400;"><b>${this.previewResult.excludedCount} vente(s) avec paiements perçus seront préservées et non annulées.</b></li>` : ''}
        </ul>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, exécuter l\'annulation',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
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
      cancellationReason: this.cancellationReason
    };

    this.executing = true;
    this.cancellationService.execute(request).subscribe({
      next: (run) => {
        this.executing = false;
        this.closeNewCancellation();
        this.loadHistory();

        Swal.fire({
          icon: 'success',
          title: 'Annulation réussie',
          html: `
            L'opération s'est terminée avec succès.<br>
            - <b>${run.cancelledSalesCount}</b> vente(s) annulée(s)<br>
            - <b>${run.excludedSalesCount}</b> vente(s) rejetée(s) pour recouvrements<br>
            - <b>${run.pdfFileCount}</b> pièce(s) d'audit archivée(s)
          `
        });
      },
      error: (err) => {
        this.executing = false;
        const msg = err?.error?.message || 'Erreur lors de l\'exécution de l\'annulation.';
        Swal.fire('Erreur d\'annulation', msg, 'error');
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
        Swal.fire('Erreur', 'Impossible de télécharger la pièce d\'audit.', 'error');
      }
    });
  }
}
