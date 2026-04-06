import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditService } from '../service/credit.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { CreditDistributionDetail } from '../types/credit.types';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { ErrorHandlingMixin } from 'src/app/shared/mixins/error-handling.mixin';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-credit-details',
  templateUrl: './credit-details.component.html',
  styleUrls: ['./credit-details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreditDetailsComponent extends ErrorHandlingMixin implements OnInit {
  credit: any | undefined;
  isLoading = true;
  creditId: number | null = null;
  distributionDetails: CreditDistributionDetail[] = [];

  timelines: any[] = [];
  collectorHistory: any[] = [];
  dailyStakeHistory: any[] = [];
  lateMetrics: any = null;

  showChangeCollectorModal = false;
  agents: any[] = [];
  selectedCommercial = '';

  constructor(
    private route: ActivatedRoute,
    private creditService: CreditService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private clientService: ClientService,
    private alertService: AlertService,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler);
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const creditId = +params['id'];
      if (creditId) {
        this.creditId = creditId;
        this.spinner.show();
        this.loadAllCreditData(creditId);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
  }

  navigateToEdit(creditId: number | null): void {
    this.router.navigate(['/credit-add', creditId]);
  }

  loadAllCreditData(creditId: number): void {
    this.isLoading = true;

    // Load Credit Data
    this.creditService.getCreditById(creditId).subscribe({
      next: (data: any) => {
        this.credit = data.data;
        this.computeLateMetrics();
      },
      error: (error) => this.handleError(error, 'Erreur de chargement')
    });


    // Load Timelines
    this.creditService.getEcheancesByCredit(creditId, 0, 1000, 'id,desc').subscribe({
      next: (response: any) => {
        if (response.data && response.data.content) {
          this.timelines = response.data.content;
        }
      },
      error: (error) => this.handleError(error, 'Erreur de chargement des échéances')
    });

    // Load Collector History
    this.creditService.getCollectorHistory(creditId).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.collectorHistory = response.data;
        }
      },
      error: (error) => this.handleError(error, 'Erreur de chargement de l\'historique commercial')
    });

    // Load Daily Stake History
    this.creditService.getDailyStakeHistory(creditId).subscribe({
      next: (response: any) => {
        if (response.data) {
          this.dailyStakeHistory = response.data;
        }
      },
      error: (error) => this.handleError(error, 'Erreur de chargement de l\'historique des mises')
    });

    // Hide spinner once all requests are initiated
    this.spinner.hide();
    this.isLoading = false;
  }

  private daysBetween(a: Date, b: Date): number {
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  private computeLateMetrics(): void {
    if (!this.credit || !this.credit.beginDate || !this.credit.expectedEndDate) {
      return;
    }

    const beginDate = new Date(this.credit.beginDate);
    const expectedEndDate = new Date(this.credit.expectedEndDate);
    const today = new Date();

    const totalDays = this.daysBetween(beginDate, expectedEndDate);
    const rawElapsed = this.daysBetween(beginDate, today);
    const elapsed = Math.max(0, Math.min(rawElapsed, totalDays)); // Plafond à date de fin

    const dailyStake = this.credit.dailyStake || 1; // Protect against division by zero
    const paid = Math.floor((this.credit.totalAmountPaid || 0) / dailyStake);
    const late = Math.max(0, elapsed - paid);

    this.lateMetrics = {
      elapsed,
      paid,
      late,
      totalDays
    };
  }

  async changeCollector(): Promise<void> {
    if (this.credit?.status !== 'INPROGRESS') {
      this.alertService.showWarning('Le statut du crédit doit être EN COURS pour modifier le commercial.');
      return;
    }

    this.spinner.show();
    try {
      this.agents = (await this.clientService.getAgents().toPromise()) || [];
      this.spinner.hide();

      if (!this.agents || this.agents.length === 0) {
        this.alertService.showWarning('Aucun commercial trouvé.');
        return;
      }

      this.showChangeCollectorModal = true;
    } catch (error) {
      this.spinner.hide();
      this.handleError(error, 'Erreur lors du chargement des commerciaux');
    }
  }

  closeChangeCollectorModal(): void {
    this.showChangeCollectorModal = false;
    this.selectedCommercial = '';
  }

  submitChangeCollector(): void {
    if (!this.selectedCommercial) return;

    this.spinner.show();
    this.creditService.changeCollector(this.credit.id, this.selectedCommercial).subscribe({
      next: (res) => {
        this.spinner.hide();
        this.closeChangeCollectorModal();
        this.alertService.showSuccess('Le commercial a été modifié avec succès.');
        if (this.creditId) {
          this.loadAllCreditData(this.creditId);
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.handleError(err, 'Erreur lors de la modification du commercial');
      }
    });
  }
}
