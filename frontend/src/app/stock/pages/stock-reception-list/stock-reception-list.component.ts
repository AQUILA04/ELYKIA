import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReceptionListItem, StockReceptionStatus } from '../../../core/models/stock-reception.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';
import { AlertService } from 'src/app/shared/service/alert.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';

interface StockReceptionListState {
  searchReference: string;
  searchDate: string | null;
  statusFilter: StockReceptionStatus | '';
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-stock-reception-list',
  templateUrl: './stock-reception-list.component.html',
  styleUrls: ['./stock-reception-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReceptionListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'stockReceptionListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  receptions: StockReceptionListItem[] = [];
  isLoading = false;
  totalElement = 0;
  totalPages = 1;
  pageSize = 10;
  currentPage = 0;
  searchReference = '';
  searchDate: string | null = null;
  statusFilter: StockReceptionStatus | '' = '';
  pendingCount = 0;

  isAdmin = false;
  isManager = false;
  currentUsername: string | null = null;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  readonly statusOptions: { value: StockReceptionStatus | ''; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'VALIDATED', label: 'Validée' },
    { value: 'REFUSED', label: 'Refusée' },
    { value: 'CANCELLED', label: 'Annulée' }
  ];

  constructor(
    private stockReceptionService: StockReceptionService,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(UserProfilConstant.ADMIN);
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.currentUsername = this.authService.getUsername();
    this.restoreState();
    this.loadReceptions();
    this.loadPendingCount();
    this.dateIntervalId = setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadReceptions(): void {
    this.isLoading = true;
    const status = this.statusFilter || null;
    this.stockReceptionService.getReceptions(
      this.currentPage,
      this.pageSize,
      this.searchReference,
      this.searchDate,
      status
    ).subscribe({
      next: (response) => {
        if (response?.data?.content) {
          this.receptions = response.data.content;
          this.totalElement = response.data.page.totalElements;
          this.totalPages = response.data.page.totalPages;
        } else {
          this.receptions = [];
          this.totalElement = 0;
          this.totalPages = 1;
        }
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: () => {
        this.receptions = [];
        this.totalElement = 0;
        this.isLoading = false;
      }
    });
  }

  loadPendingCount(): void {
    this.stockReceptionService.getReceptions(0, 1, undefined, null, 'PENDING').subscribe({
      next: (response) => {
        this.pendingCount = response?.data?.page?.totalElements ?? 0;
      },
      error: () => {
        this.pendingCount = 0;
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadReceptions();
  }

  onStatusChange(): void {
    this.currentPage = 0;
    this.loadReceptions();
  }

  refresh(): void {
    this.searchReference = '';
    this.searchDate = null;
    this.statusFilter = '';
    this.currentPage = 0;
    this.loadReceptions();
    this.loadPendingCount();
  }

  changePage(delta: number): void {
    this.currentPage = Math.max(0, Math.min(this.totalPages - 1, this.currentPage + delta));
    this.loadReceptions();
  }

  goPage(index: number): void {
    this.currentPage = index;
    this.loadReceptions();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getPaginationInfo(): string {
    if (this.totalElement === 0) return '0 résultat';
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElement);
    return `${start}–${end} sur ${this.totalElement}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(/[\s.]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusLabel(status: StockReceptionStatus): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validée';
      case 'REFUSED': return 'Refusée';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  }

  getStatusClass(status: StockReceptionStatus): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'VALIDATED': return 'badge-success';
      case 'REFUSED': return 'badge-refused';
      case 'CANCELLED': return 'badge-danger';
      default: return '';
    }
  }

  canValidateOrRefuse(reception: StockReceptionListItem): boolean {
    return this.isManager && reception.status === 'PENDING';
  }

  canAbandonPending(reception: StockReceptionListItem): boolean {
    if (reception.status !== 'PENDING') {
      return false;
    }
    const isCreator = !!this.currentUsername && reception.receivedBy === this.currentUsername;
    return isCreator || this.isManager;
  }

  canCancelValidated(reception: StockReceptionListItem): boolean {
    return this.isAdmin && reception.status === 'VALIDATED';
  }

  viewDetails(id: number): void {
    this.saveState();
    this.router.navigate(['/stock/receptions', id]);
  }

  validateReception(reception: StockReceptionListItem): void {
    this.alertService.showConfirmation(
      'Validation',
      'Valider cette entrée de stock ? Les quantités seront impactées.'
    ).then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.validateReception(reception.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été validée.', 'Validée');
            this.loadReceptions();
            this.loadPendingCount();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message || 'Erreur lors de la validation.', 'Erreur');
          }
        });
      }
    });
  }

  refuseReception(reception: StockReceptionListItem): void {
    this.alertService.showConfirmation(
      'Refus',
      'Refuser cette entrée de stock ? Aucun impact sur le stock.'
    ).then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.refuseReception(reception.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été refusée.', 'Refusée');
            this.loadReceptions();
            this.loadPendingCount();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message || 'Erreur lors du refus.', 'Erreur');
          }
        });
      }
    });
  }

  abandonReception(reception: StockReceptionListItem): void {
    this.alertService.showConfirmation(
      'Abandon',
      'Abandonner cette entrée en attente ? Aucun impact sur le stock.'
    ).then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.cancelReception(reception.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception en attente a été abandonnée.', 'Abandonnée');
            this.loadReceptions();
            this.loadPendingCount();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message || 'Erreur lors de l\'abandon.', 'Erreur');
          }
        });
      }
    });
  }

  cancelValidatedReception(reception: StockReceptionListItem): void {
    this.alertService.showConfirmation(
      'Annulation',
      'Annuler cette réception validée ? Les stocks seront reversés.'
    ).then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.cancelReception(reception.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été annulée.', 'Annulée');
            this.loadReceptions();
          },
          error: (err) => {
            const rawMessage = err.error?.message || 'Une erreur est survenue lors de l\'annulation.';
            const message = rawMessage.includes('; ')
              ? rawMessage.replace(/; /g, '<br>• ')
              : rawMessage;
            this.alertService.showError(message, 'Erreur');
          }
        });
      }
    });
  }

  private saveState(): void {
    const state: StockReceptionListState = {
      searchReference: this.searchReference,
      searchDate: this.searchDate,
      statusFilter: this.statusFilter,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const raw = sessionStorage.getItem(this.STATE_KEY);
    if (!raw) {
      return;
    }
    try {
      const state = JSON.parse(raw) as StockReceptionListState;
      this.searchReference = state.searchReference ?? '';
      this.searchDate = state.searchDate ?? null;
      this.statusFilter = state.statusFilter ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
    } catch {
      sessionStorage.removeItem(this.STATE_KEY);
    }
  }
}
