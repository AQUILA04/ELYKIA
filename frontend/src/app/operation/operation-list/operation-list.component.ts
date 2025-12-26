import { Component, OnInit } from '@angular/core';
import { OperationService } from '../service/operation.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-operation-list',
  templateUrl: './operation-list.component.html',
  styleUrls: ['./operation-list.component.scss']
})
export class OperationListComponent implements OnInit {
  operations: any[] = [];
  pagedOperations: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  isLoading = true;
  totalElement = 0;

  constructor(
    private operationService: OperationService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage : TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.loadOperations();
    this.spinner.hide();
  }

  loadOperations(): void {
    this.spinner.show();
    this.operationService.getOperation(this.currentPage, this.pageSize).subscribe(
      data => {
        if (data.statusCode !== 200 && data.statusCode !== 201) {
          this.showError('Erreur lors du chargement des opérations');
          this.spinner.hide();
          this.isLoading = false;
          return;
        }
        this.operations = data.data.content;
        this.totalElement = data.data.page.totalElements;
        this.updatePagedOperations();
        this.spinner.hide();
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des opérations', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );
  }

  updatePagedOperations(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedOperations = this.operations.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOperations();
  }

  refresh(): void {
    this.spinner.show();
    this.loadOperations();
    this.spinner.hide();
  }

  addOperation(): void {
    this.router.navigate(['/operation-add']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/operation-details', id]);
  }

  editOperation(id: number): void {
    this.router.navigate(['/operation-add', id]);
  }

  deleteOperation(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cette opération?')
    .then(result => {
      if (result) {
        this.operationService.deleteOperation(id).subscribe(
          () => {
            this.alertService.showDefaultSucces('L\'opération a été supprimée.');
            this.loadOperations();
          },
          error => {
            this.alertService.showDefaultError('Erreur lors de la suppression de l\'opération');
          }
        );
      }
    });
  }

  private showError(message: string): void {
    this.alertService.showDefaultError(message);
  }
}