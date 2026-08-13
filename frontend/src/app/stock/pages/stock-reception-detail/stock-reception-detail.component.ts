import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReception, StockReceptionItem, StockReceptionStatus } from '../../../core/models/stock-reception.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-stock-reception-detail',
  templateUrl: './stock-reception-detail.component.html',
  styleUrls: ['./stock-reception-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReceptionDetailComponent implements OnInit, OnDestroy {
  reception: StockReception | null = null;
  receptionItems: StockReceptionItem[] = [];
  isReceptionLoading = false;
  isItemsLoading = false;
  itemsPage = 0;
  readonly itemsPageSize = 30;
  itemsTotalElements = 0;
  hasMoreItems = true;

  isAdmin = false;
  isManager = false;
  currentUsername: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockReceptionService: StockReceptionService,
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

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReception(parseInt(id, 10));
    }
  }

  ngOnDestroy(): void {}

  loadReception(id: number): void {
    this.isReceptionLoading = true;
    this.stockReceptionService.getReception(id).subscribe({
      next: (response) => {
        this.reception = response.data;
        this.resetAndLoadItems();
        this.isReceptionLoading = false;
      },
      error: () => {
        this.isReceptionLoading = false;
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.hasMoreItems || this.isItemsLoading || !this.reception) {
      return;
    }

    const reachedBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 240;
    if (reachedBottom) {
      this.loadMoreItems();
    }
  }

  resetAndLoadItems(): void {
    this.receptionItems = [];
    this.itemsPage = 0;
    this.itemsTotalElements = 0;
    this.hasMoreItems = true;
    this.loadMoreItems();
  }

  loadMoreItems(): void {
    if (!this.reception || this.isItemsLoading || !this.hasMoreItems) {
      return;
    }

    this.isItemsLoading = true;
    this.stockReceptionService.getReceptionItems(this.reception.id, this.itemsPage, this.itemsPageSize).subscribe({
      next: (response) => {
        const data = response?.data;
        const pageContent: StockReceptionItem[] = data?.content ?? [];
        const totalElements = data?.page?.totalElements ?? 0;
        const totalPages = data?.page?.totalPages ?? 0;

        this.receptionItems = [...this.receptionItems, ...pageContent];
        this.itemsTotalElements = totalElements;
        this.itemsPage += 1;
        this.hasMoreItems = this.itemsPage < totalPages;
        this.isItemsLoading = false;
      },
      error: () => {
        this.isItemsLoading = false;
      }
    });
  }

  getStatusLabel(status?: StockReceptionStatus): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validée';
      case 'REFUSED': return 'Refusée';
      case 'CANCELLED': return 'Annulée';
      default: return status ?? '—';
    }
  }

  canValidateOrRefuse(): boolean {
    return !!this.reception && this.isManager && this.reception.status === 'PENDING';
  }

  canAbandonPending(): boolean {
    if (!this.reception || this.reception.status !== 'PENDING') {
      return false;
    }
    const isCreator = !!this.currentUsername && this.reception.receivedBy === this.currentUsername;
    return isCreator || this.isManager;
  }

  canCancelValidated(): boolean {
    return !!this.reception && this.isAdmin && this.reception.status === 'VALIDATED';
  }

  validateReception(): void {
    if (!this.reception) return;
    this.alertService.showConfirmation('Validation', 'Valider cette entrée de stock ?').then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.validateReception(this.reception!.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été validée.', 'Validée');
            this.loadReception(this.reception!.id);
          },
          error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors de la validation.', 'Erreur')
        });
      }
    });
  }

  refuseReception(): void {
    if (!this.reception) return;
    this.alertService.showConfirmation('Refus', 'Refuser cette entrée de stock ?').then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.refuseReception(this.reception!.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été refusée.', 'Refusée');
            this.loadReception(this.reception!.id);
          },
          error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors du refus.', 'Erreur')
        });
      }
    });
  }

  abandonReception(): void {
    if (!this.reception) return;
    this.alertService.showConfirmation('Abandon', 'Abandonner cette entrée en attente ?').then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.cancelReception(this.reception!.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception en attente a été abandonnée.', 'Abandonnée');
            this.loadReception(this.reception!.id);
          },
          error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors de l\'abandon.', 'Erreur')
        });
      }
    });
  }

  cancelValidatedReception(): void {
    if (!this.reception) return;
    this.alertService.showConfirmation('Annulation', 'Annuler cette réception validée ? Les stocks seront reversés.').then((confirmed) => {
      if (confirmed) {
        this.stockReceptionService.cancelReception(this.reception!.id).subscribe({
          next: () => {
            this.alertService.showSuccess('La réception a été annulée.', 'Annulée');
            this.loadReception(this.reception!.id);
          },
          error: (err) => this.alertService.showError(err.error?.message || 'Erreur lors de l\'annulation.', 'Erreur')
        });
      }
    });
  }

  downloadPdf(): void {
    if (this.reception) {
      this.stockReceptionService.downloadPdf(this.reception.id).subscribe({
        next: (response) => {
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RECEPTION_${this.reception?.reference}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {}
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/stock/receptions']);
  }
}
