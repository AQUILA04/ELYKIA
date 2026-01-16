import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, InventoryItemDto, ReconciliationRequest } from '../service/inventory.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from 'src/app/auth/service/auth.service';

@Component({
  selector: 'app-inventory-reconciliation',
  templateUrl: './inventory-reconciliation.component.html',
  styleUrls: ['./inventory-reconciliation.component.scss']
})
export class InventoryReconciliationComponent implements OnInit {
  inventoryId!: number;
  discrepancies: InventoryItemDto[] = [];
  selectedItem: InventoryItemDto | null = null;
  reconciliationComment: string = '';
  markAsDebt: boolean = false;
  cancelDebt: boolean = false;
  isGestionnaire: boolean = false;
  reconciliationHistory: any[] = [];
  showHistory: boolean = false;
  inputErrors: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    try {
      const user = this.authService.getCurrentUser();
      if (user && user.roles && Array.isArray(user.roles)) {
        this.isGestionnaire = user.roles.includes('ROLE_REPORT') || user.roles.includes('ROLE_RECONCILE_INVENTORY');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
    }
  }

  ngOnInit(): void {
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

  selectItem(item: InventoryItemDto): void {
    this.selectedItem = item;
    this.reconciliationComment = item.reconciliationComment || '';
    this.markAsDebt = item.markAsDebt || false;
    this.cancelDebt = item.debtCancelled || false;
    this.showHistory = false;
    this.inputErrors = [];
  }

  checkInputErrors(): void {
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

  loadReconciliationHistory(): void {
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

  reconcile(action: string): void {
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

  adjustToPhysical(): void {
    this.reconcile('ADJUST_TO_PHYSICAL');
  }

  markDebt(): void {
    this.reconcile('MARK_AS_DEBT');
  }

  cancelDebtAction(): void {
    this.reconcile('CANCEL_DEBT');
  }

  markSurplus(): void {
    this.reconcile('MARK_AS_SURPLUS');
  }

  back(): void {
    this.router.navigate(['/inventory']);
  }
}

