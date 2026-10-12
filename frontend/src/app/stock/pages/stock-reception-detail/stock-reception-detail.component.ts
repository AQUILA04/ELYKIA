import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';
import {
  StockReception,
  StockReceptionItem,
  StockReceptionStatus,
  StockReceptionValidateLine,
  StockReceptionValidateRequest
} from '../../../core/models/stock-reception.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';
import { AlertService } from 'src/app/shared/service/alert.service';
import { StockFifoFeatureService } from '../../services/stock-fifo-feature.service';

interface EditablePriceState {
  unitPrice: number | null;
  packagePrice: number | null;
}

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
  canShowPurchasePrice = false;
  fifoEnabled = false;
  currentUsername: string | null = null;

  /** Prix éditables indexés par itemId — source exacte envoyée à la validation. */
  editablePrices: Record<number, EditablePriceState> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockReceptionService: StockReceptionService,
    private authService: AuthService,
    private userService: UserService,
    private alertService: AlertService,
    private stockFifoFeatureService: StockFifoFeatureService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(UserProfilConstant.ADMIN);
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.canShowPurchasePrice = this.authService.hasRole('ROLE_SHOW_PURCHASE_PRICE');
    this.currentUsername = this.authService.getUsername();

    this.stockFifoFeatureService.isFifoEnabled().subscribe(enabled => {
      this.fifoEnabled = enabled;
      this.reapplyCatalogDefaultsIfNeeded();
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReception(parseInt(id, 10));
    }
  }

  ngOnDestroy(): void {}

  get canEditValidationPrices(): boolean {
    return this.fifoEnabled
      && this.canShowPurchasePrice
      && this.canValidateOrRefuse();
  }

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
    this.editablePrices = {};
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

        for (const item of pageContent) {
          this.initEditablePrice(item);
        }

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

  isPackagingMode(item: StockReceptionItem): boolean {
    return item.entryPackagingMode === 'WHOLESALE' || item.entryPackagingMode === 'HALF_WHOLESALE';
  }

  displayUnitPrice(item: StockReceptionItem): number {
    if (!this.canEditValidationPrices) {
      return item.unitPrice ?? 0;
    }
    if (this.isPackagingMode(item)) {
      return this.derivedUnitPrice(item);
    }
    return this.editablePrices[item.id]?.unitPrice ?? item.unitPrice ?? 0;
  }

  displayPackagePrice(item: StockReceptionItem): number {
    if (!this.canEditValidationPrices) {
      return item.packagePrice ?? 0;
    }
    return this.editablePrices[item.id]?.packagePrice ?? item.packagePrice ?? 0;
  }

  displayLineTotal(item: StockReceptionItem): number {
    if (!this.canEditValidationPrices) {
      return item.totalPrice ?? 0;
    }
    if (this.isPackagingMode(item)) {
      const packagePrice = this.displayPackagePrice(item);
      const count = item.packageCount ?? 0;
      return this.roundMoney(packagePrice * count);
    }
    const unitPrice = this.displayUnitPrice(item);
    return this.roundMoney(unitPrice * (item.quantity ?? 0));
  }

  get displayedTotalAmount(): number {
    if (!this.canEditValidationPrices || this.receptionItems.length === 0) {
      return this.reception?.totalAmount ?? 0;
    }
    return this.roundMoney(
      this.receptionItems.reduce((sum, item) => sum + this.displayLineTotal(item), 0)
    );
  }

  onUnitPriceChange(item: StockReceptionItem, raw: string | number | null): void {
    const value = this.parsePositiveNumber(raw);
    if (!this.editablePrices[item.id]) {
      this.editablePrices[item.id] = { unitPrice: null, packagePrice: null };
    }
    this.editablePrices[item.id].unitPrice = value;
  }

  onPackagePriceChange(item: StockReceptionItem, raw: string | number | null): void {
    const value = this.parsePositiveNumber(raw);
    if (!this.editablePrices[item.id]) {
      this.editablePrices[item.id] = { unitPrice: null, packagePrice: null };
    }
    this.editablePrices[item.id].packagePrice = value;
  }

  validateReception(): void {
    if (!this.reception) return;

    if (this.canEditValidationPrices) {
      const validationError = this.validateEditablePrices();
      if (validationError) {
        this.alertService.showError(validationError, 'Prix invalide');
        return;
      }
    }

    this.alertService.showConfirmation('Validation', 'Valider cette entrée de stock ?').then((confirmed) => {
      if (confirmed) {
        const body = this.canEditValidationPrices ? this.buildValidateRequest() : undefined;
        this.stockReceptionService.validateReception(this.reception!.id, body).subscribe({
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

  formatPackagingSummary(item: StockReceptionItem): string | null {
    const mode = item.entryPackagingMode;
    if (!mode || mode === 'UNIT' || !item.packageCount || !item.unitsPerPackageSnapshot) {
      return null;
    }
    const typeLabel = item.packagingTypeSnapshot === 'SAC'
      ? 'sac'
      : item.packagingTypeSnapshot === 'CARTON'
        ? 'carton'
        : 'colis';
    if (mode === 'WHOLESALE') {
      return `${item.packageCount} ${typeLabel}${item.packageCount > 1 ? 's' : ''} × ${item.unitsPerPackageSnapshot} u = ${item.quantity} u`;
    }
    if (mode === 'HALF_WHOLESALE') {
      const halfUnits = item.unitsPerPackageSnapshot / 2;
      return `${item.packageCount} demi-${typeLabel}${item.packageCount > 1 ? 's' : ''} × ${halfUnits} u = ${item.quantity} u`;
    }
    return null;
  }

  goBack(): void {
    this.router.navigate(['/stock/receptions']);
  }

  private initEditablePrice(item: StockReceptionItem): void {
    if (this.editablePrices[item.id]) {
      return;
    }
    if (this.isPackagingMode(item)) {
      this.editablePrices[item.id] = {
        unitPrice: null,
        packagePrice: this.resolveDefaultPackagePrice(item)
      };
    } else {
      this.editablePrices[item.id] = {
        unitPrice: this.resolveDefaultUnitPrice(item),
        packagePrice: null
      };
    }
  }

  private reapplyCatalogDefaultsIfNeeded(): void {
    if (!this.canEditValidationPrices) {
      return;
    }
    for (const item of this.receptionItems) {
      this.editablePrices[item.id] = this.isPackagingMode(item)
        ? { unitPrice: null, packagePrice: this.resolveDefaultPackagePrice(item) }
        : { unitPrice: this.resolveDefaultUnitPrice(item), packagePrice: null };
    }
  }

  private resolveDefaultUnitPrice(item: StockReceptionItem): number {
    if (item.catalogPurchasePrice != null && item.catalogPurchasePrice > 0) {
      return item.catalogPurchasePrice;
    }
    return item.unitPrice > 0 ? item.unitPrice : 0;
  }

  private resolveDefaultPackagePrice(item: StockReceptionItem): number {
    if (item.entryPackagingMode === 'WHOLESALE'
        && item.catalogWholesalePurchasePrice != null
        && item.catalogWholesalePurchasePrice > 0) {
      return item.catalogWholesalePurchasePrice;
    }
    if (item.entryPackagingMode === 'HALF_WHOLESALE'
        && item.catalogHalfWholesalePurchasePrice != null
        && item.catalogHalfWholesalePurchasePrice > 0) {
      return item.catalogHalfWholesalePurchasePrice;
    }
    if (item.catalogPurchasePrice != null
        && item.catalogPurchasePrice > 0
        && item.unitsPerPackageSnapshot
        && item.unitsPerPackageSnapshot > 0) {
      const unitsInMode = item.entryPackagingMode === 'HALF_WHOLESALE'
        ? item.unitsPerPackageSnapshot / 2
        : item.unitsPerPackageSnapshot;
      return this.roundMoney(item.catalogPurchasePrice * unitsInMode);
    }
    return item.packagePrice != null && item.packagePrice > 0 ? item.packagePrice : 0;
  }

  private derivedUnitPrice(item: StockReceptionItem): number {
    const packagePrice = this.displayPackagePrice(item);
    const units = item.entryPackagingMode === 'HALF_WHOLESALE'
      ? (item.unitsPerPackageSnapshot ?? 0) / 2
      : (item.unitsPerPackageSnapshot ?? 0);
    if (!units || units <= 0) {
      return 0;
    }
    return this.roundMoney(packagePrice / units);
  }

  private validateEditablePrices(): string | null {
    if (this.hasMoreItems) {
      return 'Chargez tous les articles (faites défiler jusqu\'en bas) avant de valider.';
    }
    for (const item of this.receptionItems) {
      if (this.isPackagingMode(item)) {
        const packagePrice = this.editablePrices[item.id]?.packagePrice;
        if (packagePrice == null || packagePrice <= 0) {
          return `Le prix du colis est obligatoire pour « ${item.articleName || 'article'} ».`;
        }
      } else {
        const unitPrice = this.editablePrices[item.id]?.unitPrice;
        if (unitPrice == null || unitPrice <= 0) {
          return `Le prix unitaire est obligatoire pour « ${item.articleName || 'article'} ».`;
        }
      }
    }
    return null;
  }

  private buildValidateRequest(): StockReceptionValidateRequest {
    const items: StockReceptionValidateLine[] = this.receptionItems.map(item => {
      if (this.isPackagingMode(item)) {
        return {
          itemId: item.id,
          packagePrice: this.editablePrices[item.id].packagePrice!
        };
      }
      return {
        itemId: item.id,
        unitPrice: this.editablePrices[item.id].unitPrice!
      };
    });
    return { items };
  }

  private parsePositiveNumber(raw: string | number | null): number | null {
    if (raw == null || raw === '') {
      return null;
    }
    const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(value) ? value : null;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
