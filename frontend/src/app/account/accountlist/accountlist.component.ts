import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AccountService, Account, AccountKpis } from '../service/account.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { Observable } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';

interface AccountListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-account-list',
  templateUrl: './accountlist.component.html',
  styleUrls: ['./accountlist.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AccountListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'accountListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  accounts: Account[] = [];
  accountKpis: AccountKpis | null = null;
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;
  totalPages = 0;
  searchTerm = '';
  isLoading = false;

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private accountService: AccountService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadAccounts();
    this.loadAccountKpis();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadAccounts(): void {
    this.isLoading = true;
    this.accountService.getAccount(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.accounts = data.data.content;
          this.totalElement = data.data.page.totalElements;
          this.totalPages = data.data.page.totalPages ?? 1;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.saveState();
    this.loadAccounts();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadAccounts();
  }

  refresh(): void {
    this.loadAccounts();
    this.loadAccountKpis();
  }

  loadAccountKpis(): void {
    this.accountService.getAccountKpis().subscribe({
      next: (kpis) => {
        this.accountKpis = kpis;
      },
      error: (err) => {
        console.error('Erreur chargement KPI comptes', err);
      }
    });
  }

  deleteAccount(id: number): void {
    this.alertService.showConfirmation('Êtes-vous sûr?', 'Vous ne pourrez pas récupérer ce compte!', 'Oui, supprimer!', 'Annuler')
      .then((result) => {
        if (result) {
          this.accountService.deleteAccount(id).subscribe({
            next: () => {
              this.alertService.showSuccess('Supprimé!', 'Le compte a été supprimé avec succès.');
              this.loadAccounts();
              this.loadAccountKpis();
            },
            error: (error) => {
              this.alertService.showError('Erreur', 'Erreur lors de la suppression du compte');
              console.error(error);
            }
          });
        }
      });
  }

  toggleAccountStatus(id: number, currentStatus: string): void {
    let action: string;
    let apiCall: Observable<unknown>;
    let swalText: string;

    if (currentStatus === 'CREATED') {
      action = 'activer';
      apiCall = this.accountService.activateAccount(id);
      swalText = 'Voulez-vous activer ce compte?';
    } else if (currentStatus === 'ACTIF') {
      action = 'désactiver';
      apiCall = this.accountService.deactivateAccount(id);
      swalText = 'Voulez-vous désactiver ce compte?';
    } else if (currentStatus === 'CLOSED') {
      action = 'réactiver';
      apiCall = this.accountService.activateAccount(id);
      swalText = 'Voulez-vous réactiver ce compte?';
    } else {
      this.alertService.showError('Erreur', 'État du compte inconnu');
      return;
    }

    this.alertService.showConfirmation('Êtes-vous sûr?', swalText, `${action.charAt(0).toUpperCase() + action.slice(1)}!`, 'Annuler')
      .then(result => {
        if (result) {
          apiCall.subscribe({
            next: () => {
              this.alertService.showSuccess(
                `${action.charAt(0).toUpperCase() + action.slice(1)}!`,
                `Le compte a été ${action} avec succès.`
              );
              this.loadAccounts();
              this.loadAccountKpis();
            },
            error: () => {
              this.alertService.showError('Erreur', `Erreur lors de la ${action} du compte`);
            }
          });
        }
      });
  }

  addAccount(): void {
    this.saveState();
    this.router.navigate(['/account-add'], { queryParams: { totalAccounts: this.totalElement } });
  }

  viewDetails(accountId: number): void {
    this.saveState();
    this.router.navigate(['/accountdetails', accountId]);
  }

  editAccount(accountId: number): void {
    this.saveState();
    this.router.navigate(['/account-add', accountId]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIF: 'Actif',
      CREATED: 'Créé',
      CLOSED: 'Clôturé'
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIF': return 'status-actif';
      case 'CREATED': return 'status-created';
      case 'CLOSED': return 'status-closed';
      default: return 'status-default';
    }
  }

  getToggleLabel(status: string): string {
    if (status === 'CREATED') return 'Activer';
    if (status === 'ACTIF') return 'Désactiver';
    if (status === 'CLOSED') return 'Réactiver';
    return 'Statut';
  }

  private saveState(): void {
    const state: AccountListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as AccountListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 5;
    } catch (e) {
      console.error('Erreur restauration état liste comptes', e);
    }
  }
}
