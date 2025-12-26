import { Component, OnInit } from '@angular/core';
import { AccountService, Account } from '../service/account.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Observable } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-account-list',
  templateUrl: './accountlist.component.html',
  styleUrls: ['./accountlist.component.scss']
})
export class AccountListComponent implements OnInit {
  accounts: Account[] = [];
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;

  // NOUVEAU : Propriété pour le terme de recherche
  searchTerm: string = '';

  constructor(
    private accountService: AccountService,
    private router: Router,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService,
    private alertService: AlertService
   ) {
    this.tokenStorage.checkConnectedUser();
   }

  ngOnInit(): void {
    this.loadAccounts();
  }

  // MODIFIÉ : La méthode principale de chargement inclut maintenant la recherche
  loadAccounts(): void {
    this.spinner.show();
    // On passe le terme de recherche au service
    this.accountService.getAccount(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.accounts = data.data.content;
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

  // NOUVEAU : Méthode pour déclencher la recherche
  onSearch(): void {
    this.currentPage = 0; // Toujours revenir à la première page pour une nouvelle recherche
    this.loadAccounts();
  }

  // MODIFIÉ : La pagination recharge les données en fonction de l'état actuel (recherche incluse)
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAccounts();
  }

  // MODIFIÉ : La méthode refresh réinitialise la recherche
  refresh(): void {
    this.searchTerm = '';
    this.onSearch(); // Appelle la recherche avec un terme vide pour tout recharger
  }

  deleteAccount(id: number): void {
    this.alertService.showConfirmation('Êtes-vous sûr?', 'Vous ne pourrez pas récupérer ce compte!', 'Oui, supprimer!', 'Annuler')
    .then((result) => {
      if (result) {
        this.accountService.deleteAccount(id).subscribe({
          next: () => {
            this.alertService.showSuccess('Supprimé!', 'Le compte a été supprimé avec succès.');
            this.loadAccounts(); // MODIFIÉ : Recharger les données depuis le serveur est plus fiable
          },
          error: (error) => {
            this.alertService.showError('Erreur', 'Erreur lors de la suppression du compte');
            console.error(error);
          }
        });
      }
    });
  }

  // --- Les autres méthodes restent globalement les mêmes ---

  toggleAccountStatus(id: number, currentStatus: string): void {
    let newStatus: string;
    let action: string;
    let apiCall: Observable<any>;
    let swalText: string;

    if (currentStatus === 'CREATED') { newStatus = 'ACTIF'; action = 'activer'; apiCall = this.accountService.activateAccount(id);
      swalText = 'Voulez-vous activer ce compte?';
    } else if (currentStatus === 'ACTIF') { newStatus = 'CLOSED'; action = 'désactiver'; apiCall = this.accountService.deactivateAccount(id);
      swalText = 'Voulez-vous désactiver ce compte?';
    } else if (currentStatus === 'CLOSED') { newStatus = 'ACTIF'; action = 'réactiver'; apiCall = this.accountService.activateAccount(id);
      swalText = 'Voulez-vous réactiver ce compte?';
    } else {
      this.alertService.showError('Erreur', 'État du compte inconnu');
      return;
    }
    this.alertService.showConfirmation('Êtes-vous sûr?', swalText, `${action.charAt(0).toUpperCase() + action.slice(1)}!`, 'Annuler')
    .then(result => {
      if (result) {
        apiCall.subscribe(
          () => {
            this.alertService.showSuccess(
              `${action.charAt(0).toUpperCase() + action.slice(1)}!`,
              `Le compte a été ${action} avec succès.`
            );
            this.loadAccounts();
          },
          error => {
            this.alertService.showError('Erreur', `Erreur lors de la ${action} du compte`);
          }
        );
      }
    });
  }

  addAccount(): void {
    this.router.navigate(['/account-add'], { queryParams: { totalAccounts: this.totalElement } });
  }

  viewDetails(accountId: number): void {
    this.router.navigate(['/accountdetails', accountId]);
  }

  editAccount(accountId: number): void {
    this.router.navigate(['/account-add', accountId]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIF':
        return 'badge-success';
      case 'CREATED':
        return 'badge-primary';
      case 'CLOSED':
        return 'badge-danger';
      default:
        return 'badge-secondary';
      }
  }
}
