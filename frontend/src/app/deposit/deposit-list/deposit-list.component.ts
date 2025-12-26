import { Component, OnInit } from '@angular/core';
import { DepositService } from '../service/deposit.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { PageEvent } from '@angular/material/paginator';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-deposit-list',
  templateUrl: './deposit-list.component.html',
  styleUrls: ['./deposit-list.component.scss']
})
export class DepositListComponent implements OnInit {
  deposits: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  totalElement: number = 0;
  isLoading: boolean = true;

  constructor(
    private depositService: DepositService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage : TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.loadDeposits();
  }

  loadDeposits(): void {
    this.spinner.show();
    this.depositService.getDeposit(this.currentPage, this.pageSize).subscribe(
      data => {
        this.deposits = data.content; 
        this.totalElement = data.totalElements; 
        this.spinner.hide();
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des dépôts', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadDeposits();
  }

  refresh(): void {
    this.loadDeposits();
  }

  addDeposit(): void {
    this.router.navigate(['/deposit-add']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/deposit-details', id]);
  }

  editDeposit(id: number): void {
    this.router.navigate(['/deposit-add', id]);
  }

  deleteDeposit(id: number): void {
    this.alertService.showConfirmation('Comfirmation de suppression', 'Êtes-vous sûr de vouloir supprimer ce dépôt?', 'Supprimer!', 'Annuler!')
   .then(result => {
      if (result) {
        this.depositService.deleteDesposit(id).subscribe(
          () => {
            this.alertService.showSuccess('Le dépôt a été supprimé.', 'Opération réussie!');
            this.loadDeposits();
          },
          error => {
           const errorMessage = error?.error?.message || 'Erreur lors de la suppression du dépôt';
           this.alertService.showError(errorMessage, 'Opération échouée!');
          }
        );
      }
    });
  }
}