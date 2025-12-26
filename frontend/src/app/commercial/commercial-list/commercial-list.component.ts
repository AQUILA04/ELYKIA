import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-commercial-list',
  templateUrl: './commercial-list.component.html',
  styleUrls: ['./commercial-list.component.scss']
})
export class CommercialListComponent implements OnInit {
  commercials: any[] = [];
  isLoading = true;
  pagedCommercials: any[] = [];
  pageSize: number = 5;
  currentPage: number = 0;
  totalElement = 0;

  constructor(
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService, 
    private userService: UserService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.spinner.show();
    this.loadCommercials();
    this.spinner.hide();
    this.updatePagedCommercials();
  }

  loadCommercials(): void {
    this.spinner.show();
    this.userService.getPromoters(this.currentPage, this.pageSize).subscribe(
      response => {
        this.commercials = response.data.content;
        this.totalElement = response.data.totalElements;
        this.spinner.hide();
        this.isLoading = false;
      },
      error => {
        console.error('Erreur lors du chargement des commerciaux:', error);
        this.spinner.hide();
        this.isLoading = false;
      });
  
  }

  updatePagedCommercials(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedCommercials = this.commercials.slice(start, end);
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCommercials();
  }

  refresh(): void {
    this.spinner.show();
    this.loadCommercials();
    this.spinner.hide();
  }
  
  addCommercial(): void {
    this.router.navigate(['/commercial-add']);
  }

  viewDetails(id: number): void {
    // Trouver le commercial correspondant à l'id pour obtenir son username
    const commercial = this.commercials.find(c => c.id === id);
    if (commercial) {
      this.router.navigate(['/commercial-view', id, commercial.username]);
    } else {
      this.router.navigate(['/commercial-view', id]);
    }
  }

  editCommercial(id: number): void {
    this.router.navigate(['/commercial-add', id]);
  }

  deleteCommercial(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression !', 'Êtes-vous sûr de vouloir supprimer ce commercial?', 'Oui, supprimer!', 'Annuler')
    .then(result => {
      if (result) {
        // Ici, vous devrez créer un service pour les commerciaux
        // Exemple: this.commercialService.deleteCommercial(id)
        // Pour l'instant, nous affichons juste un message
        this.alertService.showSuccess('Le commercial a été supprimé.', 'Suppression réussie');
        this.loadCommercials();
      }
    });
  }
}
