import { Component, OnInit } from '@angular/core';
import { ClientService, Client } from '../service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import {AuthService} from "../../auth/service/auth.service";

@Component({
  selector: 'app-client-list',
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.scss']
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;
  sortField = 'id,desc';

  // NOUVEAU: Propriété pour le terme de recherche
  searchTerm: string = '';

  constructor(
    private clientService: ClientService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
     this.loadClient();
  }

  loadClient(): void {
    this.spinner.show();
    const currentUser = this.authService.getCurrentUser();

    // MODIFIÉ: On passe le searchTerm au service
    this.clientService.getClients(this.currentPage, this.pageSize, this.sortField, currentUser, this.searchTerm).subscribe({
      next: (data) => {
        if(data.statusCode === 200){
          this.clients = data.data.content;
          this.totalElement = data.data.page.totalElements;
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue');
        }
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  // NOUVEAU: Méthode pour déclencher la recherche
  onSearch(): void {
    this.currentPage = 0;
    this.loadClient();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadClient();
  }

  // MODIFIÉ: La méthode refresh réinitialise la recherche
  refresh(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  deleteClient(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression', 'Êtes-vous sûr de vouloir supprimer ce client ?', 'Oui, supprimer', 'Annuler')
      .then((result) => {
        if (result) {
          this.clientService.deleteClient(id).subscribe({
            next: (resp: any) => {
              if(resp.statusCode === 200){
                this.alertService.showSuccess('Le client a été supprimé avec succès.', 'Suppression réussie!');
                              this.loadClient(); //
                }else{
                  this.alertService.showError('Erreur lors de la suppression du client : '+ resp.message );
                                console.error('Erreur lors de la suppression du client', resp);
                  }
            },
            error: (error) => {
              this.alertService.showError('Erreur lors de la suppression du client');
              console.error('Erreur lors de la suppression du client', error);
            }
          });
        }
      });
  }

  addClient(): void {
    this.router.navigate(['/client-add']);
  }

  viewDetails(clientId: number): void {
  console.log('Client details avec id :' ,clientId );
    this.router.navigate(['/client-details', clientId]);
  }

  editClient(clientId: number): void {
    this.router.navigate(['/client-add', clientId]);
  }
}
