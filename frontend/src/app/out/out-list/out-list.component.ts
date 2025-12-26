import { Component, OnInit } from '@angular/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { OutService } from '../service/out.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-out-list',
  templateUrl: './out-list.component.html',
  styleUrls: ['./out-list.component.scss']
})
export class OutListComponent implements OnInit {

  credits: any[] = [];
  pagedCredits: any[] = [];
  pageSize = 5;
  currentPage = 0;
  totalItems = 0;
  isLoading: boolean = false;  // Added isLoading for managing spinner state
  startDate: Date | null = null;
  endDate: Date | null = null;
  totalDisbursed: number | null = null;

  constructor(
    private outService: OutService,
    private permissionsService: NgxPermissionsService,
    private paginator: MatPaginatorIntl ,
    private spinner: NgxSpinnerService ,
    private router : Router,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.getAllOuts(this.currentPage, this.pageSize);
  }

  getAllOuts(page: number, pageSize: number) {
    this.isLoading = true;
    this.spinner.show();
    this.outService.getAllOut(page, pageSize).subscribe(
      (response: any) => {
        if (response.status === 'OK' && response.statusCode === 200) {
          this.credits = response.data.content;
          this.totalItems = response.data.page.totalElements;
        } else {
          console.error('Erreur: Réponse inattendue du serveur.');
        }
        this.spinner.hide();
        this.isLoading = false;
      },
      (error: any) => {
        console.error('Erreur lors du chargement des crédits:', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getAllOuts(this.currentPage, this.pageSize);
  }

  updatePagination() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedCredits = this.credits.slice(start, end);
  }

  refresh(): void {
    this.spinner.show();
    this.getAllOuts(this.currentPage, this.pageSize);
    this.spinner.hide();
  }

  loadHistory() {
    this.router.navigate(['/history']);
  }

  startCredit(id: number): void {
    this.outService.startCredit(id).subscribe(
      (response: any) => {
        if (response.statusCode === 500) {
          this.alertService.showDefaultError(response.message);
        } else {
          this.alertService.showDefaultSucces('La sortie de la vente a été enregistrée avec succès !');
          this.getAllOuts(this.currentPage, this.pageSize);
        }
      },
      (error: any) => {
        // Utiliser le message du backend s'il existe, sinon message générique
        const errorMessage = error?.error?.message || 'Une erreur est survenue lors du démarrage du crédit';
        this.alertService.showDefaultError(errorMessage);
      }
    );
  }

  deleteCredit(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cette vente ?')
    .then(result => {
      if (result) {
        this.outService.deleteCredit(id).subscribe(
          () => {
            this.alertService.showDefaultSucces('La vente a été supprimé avec succès !');
            this.getAllOuts(this.currentPage, this.pageSize);
          },
          error => {
            this.alertService.showDefaultError('Erreur lors de la suppression de la vente');
          }
        );
      }
    });
  }
  viewDetails(id: number): void {
    this.router.navigate(['/out-details', id]);
  }

 // MÉTHODE À AJOUTER
   calculateTotalDisbursed(): void {
     if (!this.startDate || !this.endDate) {
       this.alertService.showError('Veuillez sélectionner une date de début et de fin.', 'Dates manquantes');
       return;
     }

     // Formater les dates au format YYYY-MM-DD que l'API attend
     const formattedStartDate = this.formatDate(this.startDate);
     const formattedEndDate = this.formatDate(this.endDate);

     this.spinner.show();
     this.outService.getTotalDisbursed(formattedStartDate, formattedEndDate).subscribe(
       (response: any) => {
         if (response.status === 'OK' && response.statusCode === 200) {
           this.totalDisbursed = response.data;
         } else {
           this.alertService.showDefaultError('La réponse du serveur est inattendue.');
         }
         this.spinner.hide();
       },
       (error: any) => {
         this.alertService.showDefaultError('Erreur lors du calcul du total.');
         console.error('Erreur:', error);
         this.spinner.hide();
       }
     );
   }

   // PETITE FONCTION UTILITAIRE À AJOUTER
   private formatDate(date: Date): string {
     const d = new Date(date);
     let month = '' + (d.getMonth() + 1);
     let day = '' + d.getDate();
     const year = d.getFullYear();

     if (month.length < 2) month = '0' + month;
     if (day.length < 2) day = '0' + day;

     return [year, month, day].join('-');
   }

  getBadgeClass(remainingDaysCount: number): string {
    if (remainingDaysCount === 0) {
      return 'badge-danger';
    } else if (remainingDaysCount <= 5) {
      return 'badge-warning';
    } else {
      return 'badge-success';
    }
  }

  generatePdf() {
    this.spinner.show();
    this.outService.generatePdf().subscribe(
      (response: any) => {
        this.spinner.hide();
        // Handle PDF download
      },
      (error: any) => {
        this.spinner.hide();
        const errorMessage = error?.error?.message || 'Erreur lors de la génération du PDF';
        this.alertService.showError(errorMessage, 'Génération de pdf échouée');
      }
    );
  }

  // Remplacer la méthode listPdfFiles par navigateToPdfList
  navigateToPdfList() {
    this.router.navigate(['/out-pdf-list']);
  }

  navigateToOldReleaseList() {
    this.router.navigate(['/old-release-list']);
  }

  // Supprimer la méthode listPdfFiles existante
  listPdfFiles() {
    this.spinner.show();
    this.outService.listPdfFiles().subscribe(
      (response: any) => {
        this.spinner.hide();
        // Open modal/dialog with PDF list
      },
      (error: any) => {
        this.spinner.hide();
        const errorMessage = error?.error?.message || 'Erreur lors du chargement de la liste PDF !';
        this.alertService.showError(errorMessage, 'Chargment des pdf échoués');
      }
    );
  }
}
