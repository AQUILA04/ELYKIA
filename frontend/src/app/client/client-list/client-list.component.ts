import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ClientService, Client, ClientKpis } from '../service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../auth/service/auth.service';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { Collector } from 'src/app/credit/types/credit-merge.types';
import { NgxSpinnerService } from 'ngx-spinner';

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
  dualCreditEnabled = false;
  isGestionnaire = false;

  exportLoading = false;

  selectedClients: Set<number> = new Set();
  isAllSelected = false;
  showBulkAssignCollectorModal = false;
  collectors: Collector[] = [];
  selectedCreditCollector = '';
  selectedTontineCollector = '';
  transferInProgressCredits = false;

  constructor(
    private clientService: ClientService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private authService: AuthService,
    private featureFlagService: FeatureFlagService,
    private userService: UserService,
    private spinner: NgxSpinnerService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.dualCreditEnabled = this.featureFlagService.isFeatureEnabled(FeatureFlags.DualCreditAuthorization);
    this.isGestionnaire = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
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

  downloadClientsPdf(): void {
    if (!this.selectedCommercial) {
      return;
    }
    this.exportLoading = true;
    this.clientService.exportClientsPdf(this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fiche_client_${this.selectedCommercial}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.alertService.toastSuccess('Fiche Client téléchargée avec succès');
      },
      error: (err) => {
        console.error('Export PDF clients', err);
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
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
    this.selectedClients.clear();
    this.isAllSelected = false;
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
    this.router.navigate(['/client/add']);
  }

  viewDetails(clientId: number): void {
    this.saveState();
    this.router.navigate(['/client/details', clientId]);
  }

  editClient(clientId: number): void {
    this.saveState();
    this.router.navigate(['/client/add', clientId]);
  }

  authorizeBusinessCredit(client: Client, event: Event): void {
    event.stopPropagation();
    this.clientService.authorizeBusinessCredit(client.id).subscribe({
      next: (response) => {
        Object.assign(client, response.data);
        this.alertService.toastSuccess('Client habilité au crédit business');
      },
      error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors de l\'habilitation')
    });
  }

  revokeBusinessCredit(client: Client, event: Event): void {
    event.stopPropagation();
    this.clientService.revokeBusinessCreditAuthorization(client.id).subscribe({
      next: (response) => {
        Object.assign(client, response.data);
        this.alertService.toastSuccess('Habilitation retirée');
      },
      error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors de la révocation')
    });
  }

  onCommercialSelected(commercial: string | null): void {
    this.selectedCommercial = commercial;
    this.currentPage = 0;
    this.selectedClients.clear();
    this.isAllSelected = false;
    this.saveState();
    this.loadClientKpis();
    this.loadClient();
  }

  toggleSelection(clientId: number): void {
    if (this.selectedClients.has(clientId)) {
      this.selectedClients.delete(clientId);
    } else {
      this.selectedClients.add(clientId);
    }
    this.isAllSelected = this.clients.length > 0 && this.selectedClients.size === this.clients.length;
  }

  toggleAllSelection(): void {
    if (this.isAllSelected) {
      this.selectedClients.clear();
    } else {
      this.clients.forEach(c => this.selectedClients.add(c.id));
    }
    this.isAllSelected = !this.isAllSelected;
  }

  isSelected(clientId: number): boolean {
    return this.selectedClients.has(clientId);
  }

  openBulkAssignCollectorModal(): void {
    if (this.selectedClients.size === 0) {
      this.alertService.showWarning('Veuillez sélectionner au moins un client.');
      return;
    }
    this.loadCollectors();
    this.showBulkAssignCollectorModal = true;
  }

  closeBulkAssignCollectorModal(): void {
    this.showBulkAssignCollectorModal = false;
    this.selectedCreditCollector = '';
    this.selectedTontineCollector = '';
    this.transferInProgressCredits = false;
  }

  confirmBulkAssignCollector(): void {
    if (!this.selectedCreditCollector && !this.selectedTontineCollector) {
      this.alertService.showWarning('Veuillez sélectionner au moins un commercial crédit ou tontine.');
      return;
    }

    const dto: {
      clientIds: number[];
      collector?: string;
      tontineCollector?: string;
      transferInProgressCredits?: boolean;
    } = {
      clientIds: Array.from(this.selectedClients),
      transferInProgressCredits: this.transferInProgressCredits && !!this.selectedCreditCollector
    };
    if (this.selectedCreditCollector) {
      dto.collector = this.selectedCreditCollector;
    }
    if (this.selectedTontineCollector) {
      dto.tontineCollector = this.selectedTontineCollector;
    }

    this.spinner.show();
    this.clientService.bulkAssignCollectors(dto).subscribe({
      next: () => {
        this.spinner.hide();
        this.alertService.showSuccess(
          this.transferInProgressCredits && this.selectedCreditCollector
            ? 'Changement de commercial effectué. Le transfert des ventes en cours a été lancé.'
            : 'Changement de commercial effectué avec succès.'
        );
        this.closeBulkAssignCollectorModal();
        this.selectedClients.clear();
        this.isAllSelected = false;
        this.loadClient();
      },
      error: (error) => {
        this.spinner.hide();
        this.alertService.showError(error.error?.message || 'Erreur lors du changement de commercial.');
        console.error(error);
      }
    });
  }

  private loadCollectors(): void {
    if (this.collectors.length > 0) {
      return;
    }
    this.clientService.getAgents().subscribe({
      next: (data) => {
        this.collectors = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commerciaux', error);
        this.alertService.showError('Erreur lors du chargement des commerciaux');
        this.collectors = [];
      }
    });
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
