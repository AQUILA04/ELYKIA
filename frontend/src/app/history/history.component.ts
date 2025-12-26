import { Component, OnInit } from '@angular/core';
import { OutListComponent } from '../out/out-list/out-list.component';
import { OutService } from '../out/service/out.service';
import { NgxPermissionsService } from 'ngx-permissions';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { AlertService } from '../shared/service/alert.service';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {              
  pageSize = 5;     
  currentPage = 0;
  totalItems = 0;  
  sortDirection = 'asc';
  credits: any[] = [];
  pagedCredits: any[] = [];
  isLoading = true;
  totalElement = 0;

  constructor(
    private outService: OutService,            
    private permissionsService: NgxPermissionsService, 
    private spinner: NgxSpinnerService,
    private router : Router,
    private alertService: AlertService   
  ) { }

  ngOnInit(): void {
    this.getHistory();
  }

  getHistory(page: number = this.currentPage, pageSize: number = this.pageSize, sort: string = this.sortDirection) {
    this.isLoading = true;
    this.spinner.show();
    
    this.outService.getHistory(page, pageSize, sort).subscribe(
      (response: any) => {
        if (response.status === 'OK' && response.statusCode === 200) {
          this.credits = response.data.content;
          this.totalItems = response.total; 
        } else {
          console.error('Erreur: Réponse inattendue du serveur.');
        }
        this.spinner.hide();
        this.isLoading = false;
      },
      (error) => {
        console.error('Erreur lors de la récupération des crédits historiques:', error);
        this.spinner.hide();
        this.isLoading = false;
      }
    );
  }

  
  loadHistory() {
    this.getHistory();
  }
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHistory();  
  }
  viewDetails(id: number): void {
    this.router.navigate(['/history-details', id]);
  }

  backToStore(id: number): void {
    this.router.navigate(['/back-store', id]);
  }

  deleteCredit(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cette vente?')
    .then(result => {
      if (result) {
        this.outService.deleteCredit(id).subscribe(
          () => {
            this.alertService.showDefaultSucces('La vente a été supprimé avec succès !');
            this.getHistory(this.currentPage, this.pageSize);  
          },
          error => {
            this.alertService.showDefaultError('Erreur lors de la suppression de la vente !');
          }
        );
      }
    });
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
}
