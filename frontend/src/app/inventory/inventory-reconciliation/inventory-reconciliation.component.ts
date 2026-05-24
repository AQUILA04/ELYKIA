import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, InventoryItemDto, ReconciliationRequest, BulkReconciliationRequest } from '../service/inventory.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';

@Component({
  selector: 'app-inventory-reconciliation',
  templateUrl: './inventory-reconciliation.component.html',
  styleUrls: ['./inventory-reconciliation.component.scss']
})
export class InventoryReconciliationComponent implements OnInit {
  inventoryId!: number;
  discrepancies: InventoryItemDto[] = [];
  selectedItems: InventoryItemDto[] = [];
  selectedItem: InventoryItemDto | null = null;
  selectedStatus: string | null = null;
  reconciliationComment: string = '';
  markAsDebt: boolean = false;
  cancelDebt: boolean = false;
  isGestionnaire: boolean = false;
  reconciliationHistory: any[] = [];
  showHistory: boolean = false;
  inputErrors: any[] = [];
  showConfirmModal: boolean = false;
  pendingAction: string | null = null;
  isMultiSelectEnabled: boolean = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly inventoryService: InventoryService,
    private readonly spinner: NgxSpinnerService,
    private readonly alertService: AlertService,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService
  ) {
    try {
      const user = this.authService.getCurrentUser();
      if (user?.roles && Array.isArray(user.roles)) {
        this.isGestionnaire = user.roles.includes('ROLE_REPORT') || user.roles.includes('ROLE_RECONCILE_INVENTORY');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
    }
  }

  ngOnInit(): void {
    this.featureFlagService.flags$.subscribe(flags => {
      this.isMultiSelectEnabled = flags[FeatureFlags.InventoryReconciliationMultiSelect] || false;
    });
    this.route.params.subscribe(params => {
      this.inventoryId = +params['id'];
      this.loadDiscrepancies();
    });
  }

  loadDiscrepancies(): void {
    this.spinner.show();
    this.inventoryService.getDiscrepancies(this.inventoryId).subscribe({
      next: (items: InventoryItemDto[]) => {
        this.discrepancies = items;
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du chargement des écarts.');
        console.error(err);
      }
    });
  }

  // --- Methods for Multi-Select (New UI) ---

  toggleSelection(item: InventoryItemDto): void {
    const index = this.selectedItems.findIndex(i => i.id === item.id);

    if (index > -1) {
      this.selectedItems.splice(index, 1);
      if (this.selectedItems.length === 0) {
        this.selectedStatus = null;
        this.resetForm();
      }
    } else {
      if (this.selectedItems.length === 0) {
        this.selectedStatus = item.status;
      } else if (item.status !== this.selectedStatus) {
        this.alertService.toastError('Vous ne pouvez sélectionner que des articles avec le même statut.');
        return;
      }
      this.selectedItems.push(item);

      if (this.selectedItems.length === 1) {
        this.reconciliationComment = item.reconciliationComment || '';
        this.markAsDebt = item.markAsDebt || false;
        this.cancelDebt = item.debtCancelled || false;
      } else {
        this.reconciliationComment = '';
        this.markAsDebt = false;
        this.cancelDebt = false;
      }
    }

    this.showHistory = false;
    this.inputErrors = [];
  }

  selectAll(): void {
    if (!this.selectedStatus) {
      if (this.discrepancies.length > 0) {
        this.selectedStatus = this.discrepancies[0].status;
      } else {
        return;
      }
    }

    const selectableItems = this.discrepancies.filter(item => item.status === this.selectedStatus);

    if (this.selectedItems.length === selectableItems.length) {
      this.selectedItems = [];
      this.selectedStatus = null;
      this.resetForm();
    } else {
      this.selectedItems = [...selectableItems];
      if (this.selectedItems.length > 1) {
          this.reconciliationComment = '';
          this.markAsDebt = false;
          this.cancelDebt = false;
      }
    }
  }

  isSelected(item: InventoryItemDto): boolean {
    return this.selectedItems.some(i => i.id === item.id);
  }

  resetForm(): void {
    this.reconciliationComment = '';
    this.markAsDebt = false;
    this.cancelDebt = false;
    this.showHistory = false;
    this.inputErrors = [];
  }

  checkInputErrorsMulti(): void {
    if (this.selectedItems.length !== 1) {
      this.alertService.toastError('Veuillez sélectionner un seul article pour voir ses erreurs de saisie.');
      return;
    }

    const item = this.selectedItems[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();

    this.spinner.show();
    this.inventoryService.checkForInputErrors(
      item.id,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ).subscribe({
      next: (movements: any[]) => {
        this.inputErrors = movements;
        this.spinner.hide();
        if (movements.length === 0) {
          this.alertService.showDefaultSucces('Aucune erreur de saisie détectée dans l\'historique des sorties.');
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors de la vérification des erreurs.');
        console.error(err);
      }
    });
  }

  loadReconciliationHistoryMulti(): void {
    if (this.selectedItems.length !== 1) {
      this.alertService.toastError('Veuillez sélectionner un seul article pour voir son historique.');
      return;
    }

    const item = this.selectedItems[0];
    this.spinner.show();
    this.inventoryService.getReconciliationHistory(item.id).subscribe({
      next: (history: any[]) => {
        this.reconciliationHistory = history;
        this.showHistory = true;
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du chargement de l\'historique.');
        console.error(err);
      }
    });
  }

  prepareReconcile(action: string): void {
    if (this.selectedItems.length === 0) return;
    this.pendingAction = action;
    this.showConfirmModal = true;
  }

  confirmReconcile(): void {
    if (this.selectedItems.length === 0 || !this.pendingAction) {
        this.showConfirmModal = false;
        return;
    }

    const action = this.pendingAction;
    this.showConfirmModal = false;
    this.pendingAction = null;

    if (this.selectedItems.length === 1) {
      const reconciliationData: ReconciliationRequest = {
        inventoryItemId: this.selectedItems[0].id,
        comment: this.reconciliationComment,
        markAsDebt: this.markAsDebt,
        cancelDebt: this.cancelDebt,
        action: action
      };

      this.spinner.show();
      this.inventoryService.reconcileItem(reconciliationData).subscribe({
        next: (response: any) => {
          this.spinner.hide();
          if (response?.statusCode && response.statusCode > 400) {
            this.alertService.toastError(response.message || 'Une erreur est survenue lors de la réconciliation.');
          } else {
            this.alertService.toastSuccess('Réconciliation effectuée avec succès.');
            this.selectedItems = [];
            this.selectedStatus = null;
            this.loadDiscrepancies();
          }
        },
        error: (err) => {
          this.spinner.hide();
          const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la réconciliation.';
          this.alertService.toastError(errorMessage);
          console.error(err);
        }
      });
    } else {
      const bulkData: BulkReconciliationRequest = {
        inventoryItemIds: this.selectedItems.map(i => i.id),
        comment: this.reconciliationComment,
        markAsDebt: this.markAsDebt,
        cancelDebt: this.cancelDebt,
        action: action
      };

      this.spinner.show();
      this.inventoryService.bulkReconcile(bulkData).subscribe({
        next: (response: any) => {
          this.spinner.hide();
          if (response?.statusCode && response.statusCode > 400) {
            this.alertService.toastError(response.message || 'Une erreur est survenue lors de la réconciliation en lot.');
          } else {
            const results = response?.results || [];
            const failures = results.filter((r: any) => !r.success);
            if (failures.length > 0) {
              this.alertService.toastError(`${failures.length} articles n'ont pas pu être réconciliés.`);
            } else {
               this.alertService.toastSuccess('Réconciliation en lot effectuée avec succès.');
            }
            this.selectedItems = [];
            this.selectedStatus = null;
            this.loadDiscrepancies();
          }
        },
        error: (err) => {
          this.spinner.hide();
          const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la réconciliation en lot.';
          this.alertService.toastError(errorMessage);
          console.error(err);
        }
      });
    }
  }

  cancelReconcile(): void {
    this.showConfirmModal = false;
    this.pendingAction = null;
  }

  adjustToPhysicalMulti(): void {
    this.prepareReconcile('ADJUST_TO_PHYSICAL');
  }

  markDebtMulti(): void {
    this.prepareReconcile('MARK_AS_DEBT');
  }

  cancelDebtActionMulti(): void {
    this.prepareReconcile('CANCEL_DEBT');
  }

  markSurplusMulti(): void {
    this.prepareReconcile('MARK_AS_SURPLUS');
  }


  // --- Methods for Single-Select (Old UI) ---

  selectItemSingle(item: InventoryItemDto): void {
    this.selectedItem = item;
    this.reconciliationComment = item.reconciliationComment || '';
    this.markAsDebt = item.markAsDebt || false;
    this.cancelDebt = item.debtCancelled || false;
    this.showHistory = false;
    this.inputErrors = [];
  }

  checkInputErrorsSingle(): void {
    if (!this.selectedItem) return;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();

    this.spinner.show();
    this.inventoryService.checkForInputErrors(
      this.selectedItem.id,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ).subscribe({
      next: (movements: any[]) => {
        this.inputErrors = movements;
        this.spinner.hide();
        if (movements.length === 0) {
          this.alertService.showDefaultSucces('Aucune erreur de saisie détectée dans l\'historique des sorties.');
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors de la vérification des erreurs.');
        console.error(err);
      }
    });
  }

  loadReconciliationHistorySingle(): void {
    if (!this.selectedItem) return;

    this.spinner.show();
    this.inventoryService.getReconciliationHistory(this.selectedItem.id).subscribe({
      next: (history: any[]) => {
        this.reconciliationHistory = history;
        this.showHistory = true;
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du chargement de l\'historique.');
        console.error(err);
      }
    });
  }

  reconcileSingle(action: string): void {
    if (!this.selectedItem) return;

    const reconciliationData: ReconciliationRequest = {
      inventoryItemId: this.selectedItem.id,
      comment: this.reconciliationComment,
      markAsDebt: this.markAsDebt,
      cancelDebt: this.cancelDebt,
      action: action
    };

    this.spinner.show();
    this.inventoryService.reconcileItem(reconciliationData).subscribe({
      next: (response: any) => {
        this.spinner.hide();
        this.alertService.showDefaultSucces('Réconciliation effectuée avec succès.');
        this.selectedItem = null;
        this.loadDiscrepancies();
      },
      error: (err) => {
        this.spinner.hide();
        const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la réconciliation.';
        this.alertService.showError(errorMessage);
        console.error(err);
      }
    });
  }

  adjustToPhysicalSingle(): void {
    this.reconcileSingle('ADJUST_TO_PHYSICAL');
  }

  markDebtSingle(): void {
    this.reconcileSingle('MARK_AS_DEBT');
  }

  cancelDebtActionSingle(): void {
    this.reconcileSingle('CANCEL_DEBT');
  }

  markSurplusSingle(): void {
    this.reconcileSingle('MARK_AS_SURPLUS');
  }

  back(): void {
    this.router.navigate(['/inventory']);
  }
}
