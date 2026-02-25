import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditService } from '../service/credit.service';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { CreditDistributionDetail } from '../types/credit.types';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { ErrorHandlingMixin } from 'src/app/shared/mixins/error-handling.mixin';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';


@Component({
  selector: 'app-credit-details',
  templateUrl: './credit-details.component.html',
  styleUrls: ['./credit-details.component.scss']
})
export class CreditDetailsComponent extends ErrorHandlingMixin implements OnInit {
  credit: any | undefined;
  isLoading = true;
  creditId: number | null;
  distributionDetails: CreditDistributionDetail[] = [];

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
    this.creditId = 1;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const creditId = +params['id'];
      this.spinner.show();
      this.loadCreditDetails(creditId);
      this.loadDistributionDetails(creditId);
      console.log('id du credit', creditId)
      this.creditId = creditId;
    });
  }
  onCancel(): void {
    this.router.navigate(['/credit-list']);
  }
  navigateToEdit(creditId: number | null): void {
    console.log('navigatetoEDit', creditId)
    this.router.navigate(['/credit-add', creditId]);
  }


  loadCreditDetails(creditId: number): void {
    this.spinner.show();
    this.creditService.getCreditById(creditId).subscribe({
      next: (data: any) => {
        this.credit = data.data;
        this.isLoading = false;
        this.spinner.hide();
      },
      error: (error) => {
        // Utiliser notre système de gestion d'erreur amélioré
        this.handleError(error, 'Erreur de chargement');
        this.isLoading = false;
        this.spinner.hide();
      }
    });
  }

  loadDistributionDetails(creditId: number): void {
    this.creditService.getCreditDistributionDetails(creditId).subscribe({
      next: (response) => {
        if (response.data) {
          this.distributionDetails = response.data;
        }
      },
      error: (error) => {
        // Utiliser notre système de gestion d'erreur amélioré
        this.handleError(error, 'Erreur de chargement des détails');
      }
    });
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
          this.loadCreditDetails(this.creditId);
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.handleError(err, 'Erreur lors de la modification du commercial');
      }
    });
  }

}