import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { NgxSpinnerService } from 'ngx-spinner';
import { GestionService } from '../service/gestion.service';
import Swal from 'sweetalert2';
import { PageEvent } from '@angular/material/paginator';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-gestion-list',
  templateUrl: './gestion-list.component.html',
  styleUrls: ['./gestion-list.component.scss']
})
export class GestionListComponent implements OnInit {
  gestions: any[] = [];
  pagedCredits: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  isLoading = true;
  totalElement = 0;

  constructor(
    private gestionService: GestionService,
    private router: Router,
    private permissionsService: NgxPermissionsService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.spinner.show();
    this.loadGestion();
    this.spinner.hide();
  }

  loadGestion(): void {
    this.spinner.show();
    this.gestionService.getGestion(this.currentPage, this.pageSize).subscribe(
      data => {
        if (data.statusCode !== 200 && data.statusCode !== 201) {
          this.showError('Erreur lors du chargement des crédits');
          this.spinner.hide();
          this.isLoading = false;
          return;
        }
        this.gestions = data.data.content;
        this.totalElement = data.data.page.totalElements;
        this.updatePagedCredits();
        this.spinner.hide();
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des crédits', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );
  }

  updatePagedCredits(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedCredits = this.gestions.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadGestion();
  }

  refresh(): void {
    this.spinner.show();
    this.loadGestion();
    this.spinner.hide();
  }

  addGestion(): void {
    this.router.navigate(['/gestion-add']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/gestion-details', id]);
  }

  editGestion(id: number): void {
    this.router.navigate(['/gestion-add', id]);
  }

  deleteGestion(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression!', 'Êtes-vous sûr de vouloir supprimer cette agence ?', 'Oui, supprimer!', 'Annuler')
    .then(result => {
      if (result) {
        this.gestionService.deleteGestion(id).subscribe(
          () => {
            this.alertService.showSuccess('Agence a été supprimé.', 'Opération réussie!');
            this.loadGestion();
          },
          error => {
           this.showError('Erreur lors de la suppression de l agence');
          }
        );
      }
    });
  }

  // validateCredit(id: number): void {
  //   Swal.fire({
  //     title: 'Êtes-vous sûr?',
  //     text: 'Voulez-vous valider ce crédit?',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     cancelButtonColor: '#d33',
  //     confirmButtonText: 'valider!',
  //     cancelButtonText: 'Annuler',
  //     reverseButtons: true
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.gestionService.validateCredit(id).subscribe(
  //         () => {
  //           Swal.fire('Validé!', 'Le crédit a été validé.', 'success');
  //           this.loadGestion();
  //         },
  //         error => {
  //           Swal.fire('Erreur', 'Erreur lors de la validation du crédit', 'error');
  //         }
  //       );
  //     }
  //   });
  // }

  // startCredit(id: number): void {
  //   Swal.fire({
  //     title: 'Êtes-vous sûr?',
  //     text: 'Voulez-vous démarrer ce crédit?',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     cancelButtonColor: '#d33',
  //     confirmButtonText: 'Oui, démarrer!',
  //     cancelButtonText: 'Annuler',
  //     reverseButtons: true
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.gestionService.startCredit(id).subscribe(
  //         () => {
  //           Swal.fire('Démarré!', 'Le crédit a été démarré.', 'success');
  //           this.loadGestion();
  //         },
  //         error => {
  //           Swal.fire('Erreur', 'Erreur lors du démarrage du crédit', 'error');
  //         }
  //       );
  //     }
  //   });
  // }

  private showError(message: string): void {
    this.alertService.showError(message, 'Opération échouée!');
  }

  getBadgeClass(remainingDays: number): string {
    if (remainingDays === null) {
      return 'badge-grey';
    } else if (remainingDays < 5) {
      return 'badge-red';
    } else if (remainingDays <= 15) {
      return 'badge-orange';
    } else {
      return 'badge-green';
    }
  }
}