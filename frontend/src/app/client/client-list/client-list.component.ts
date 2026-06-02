import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ClientService, Client, ClientKpis } from '../service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../auth/service/auth.service';

interface ClientListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  sortField: string;
  selectedCommercial: string | null;
}

@Component({
  selector: 'app-client-list',
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ClientListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'clientListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  clients: Client[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElement = 0;
  isLoading = true;
  sortField = 'id,desc';
  searchTerm = '';
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  clientKpis: ClientKpis | null = null;

  constructor(
    private clientService: ClientService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadClientKpis();
    this.loadClient();
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

  private getEffectiveUsername(): string {
    const currentUser = this.authService.getCurrentUser();
    return this.selectedCommercial || currentUser?.username || '';
  }

  loadClientKpis(): void {
    const username = this.getEffectiveUsername();
    this.clientService.getClientKpis(username).subscribe({
      next: (kpis) => {
        this.clientKpis = kpis;
      },
      error: (err) => {
        console.error('Erreur chargement KPI clients', err);
      }
    });
  }

  loadClient(): void {
    this.isLoading = true;
    const usernameToUse = this.getEffectiveUsername();

    this.clientService.getClients(this.currentPage, this.pageSize, this.sortField, usernameToUse, this.searchTerm).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.clients = data.data.content;
          this.totalElement = data.data.page?.totalElements ?? data.data.totalElements ?? 0;
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
    this.loadClientKpis();
    this.loadClient();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadClientKpis();
    this.loadClient();
  }

  refresh(): void {
    this.loadClientKpis();
    this.loadClient();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCommercial = null;
    this.currentPage = 0;
    this.saveState();
    this.loadClientKpis();
    this.loadClient();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadClient();
  }

  deleteClient(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression', 'Êtes-vous sûr de vouloir supprimer ce client ?', 'Oui, supprimer', 'Annuler')
      .then((result) => {
        if (result) {
          this.clientService.deleteClient(id).subscribe({
            next: (resp: any) => {
              if (resp.statusCode === 200) {
                this.alertService.showSuccess('Le client a été supprimé avec succès.', 'Suppression réussie!');
                this.loadClientKpis();
                this.loadClient();
              } else {
                this.alertService.showError('Erreur lors de la suppression du client : ' + resp.message);
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
    this.saveState();
    this.router.navigate(['/client-add']);
  }

  viewDetails(clientId: number): void {
    this.saveState();
    this.router.navigate(['/client-details', clientId]);
  }

  editClient(clientId: number): void {
    this.saveState();
    this.router.navigate(['/client-add', clientId]);
  }

  onCommercialSelected(commercial: string | null): void {
    this.selectedCommercial = commercial;
    this.currentPage = 0;
    this.saveState();
    this.loadClientKpis();
    this.loadClient();
  }

  private saveState(): void {
    const state: ClientListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      sortField: this.sortField,
      selectedCommercial: this.selectedCommercial
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as ClientListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
      this.sortField = state.sortField ?? 'id,desc';
      this.selectedCommercial = state.selectedCommercial ?? null;
    } catch (e) {
      console.error('Erreur restauration état liste clients', e);
    }
  }
}
