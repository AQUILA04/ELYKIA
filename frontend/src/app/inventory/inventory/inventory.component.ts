import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { InventoryService, Inventory, ApiResponse, InventoryDto } from '../service/inventory.service';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ItemService, StockValues } from '../../article/service/item.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../auth/service/auth.service';
import { saveAs } from 'file-saver';
import { MatDialog } from '@angular/material/dialog';
import { PhysicalQuantityModalComponent } from '../physical-quantity-modal/physical-quantity-modal.component';
import { StockFifoFeatureService } from 'src/app/stock/services/stock-fifo-feature.service';

interface InventoryListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class InventoryComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'inventoryListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  inventory: Inventory[] = [];
  filteredInventory: Inventory[] = [];
  searchTerm = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  isLoading = false;
  isProcessing = false;

  stockValues: StockValues | null = null;
  isGestionnaire = false;
  fifoEnabled = false;
  currentInventory: InventoryDto | null = null;

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly router: Router,
    private readonly tokenStorage: TokenStorageService,
    private readonly itemService: ItemService,
    private readonly alertService: AlertService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly stockFifoFeatureService: StockFifoFeatureService
  ) {
    this.tokenStorage.checkConnectedUser();
    try {
      const user = this.authService.getCurrentUser();
      if (user?.roles && Array.isArray(user.roles)) {
        this.isGestionnaire = user.roles.includes('ROLE_REPORT');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
    }
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadInventories();
    this.loadCurrentInventory();
    if (this.isGestionnaire) {
      this.loadStockValues();
      this.stockFifoFeatureService.isFifoEnabled().subscribe(enabled => {
        this.fifoEnabled = enabled;
      });
    }
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

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Clôturé',
      CANCELLED: 'Annulé'
    };
    return labels[status] ?? status;
  }

  loadStockValues(): void {
    this.itemService.getDetailedStockValues().subscribe({
      next: (values) => {
        this.stockValues = values;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des valeurs du stock', err);
      }
    });
  }

  loadInventories(): void {
    this.isLoading = true;
    const search = this.searchTerm.trim();

    const request$ = search
      ? this.inventoryService.searchInventories(search, this.currentPage, this.pageSize)
      : this.inventoryService.getInventories(this.currentPage, this.pageSize);

    request$.subscribe({
      next: (response: ApiResponse) => {
        if (response.status === 'OK' && response.statusCode === 200) {
          this.inventory = response.data.content;
          this.filteredInventory = [...this.inventory];
          this.totalElements = response.data.page.totalElements;
          this.pageSize = response.data.page.size;
          this.lastUpdate = new Date();
        } else {
          console.error('Erreur: Réponse inattendue du serveur.');
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des inventaires:', error);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.saveState();
    this.loadInventories();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  resetAllStock(): void {
    this.alertService.showDeleteConfirmation(
      'Êtes-vous sûr de vouloir réinitialiser le stock de TOUS les articles à zéro ? Cette action est irréversible.'
    ).then((result: boolean) => {
      if (result) {
        this.isProcessing = true;
        this.itemService.resetAllStock().subscribe({
          next: () => {
            this.isProcessing = false;
            this.alertService.showDefaultSucces('Le stock de tous les articles a été réinitialisé.');
            this.refresh();
          },
          error: (err) => {
            this.isProcessing = false;
            const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la réinitialisation.';
            this.alertService.showError(errorMessage);
            console.error(err);
          }
        });
      }
    });
  }

  resetStockForArticle(articleId: number, articleName: string): void {
    this.alertService.showDeleteConfirmation(
      `Êtes-vous sûr de vouloir réinitialiser le stock de l'article "${articleName}" à zéro ?`
    ).then((result: boolean) => {
      if (result) {
        this.isProcessing = true;
        this.itemService.resetStockForArticle(articleId).subscribe({
          next: () => {
            this.isProcessing = false;
            this.alertService.showDefaultSucces(`Le stock pour "${articleName}" a été réinitialisé.`);
            this.refresh();
          },
          error: (err) => {
            this.isProcessing = false;
            this.alertService.showError('Une erreur est survenue.');
            console.error(err);
          }
        });
      }
    });
  }

  refresh(): void {
    this.loadInventories();
    this.loadCurrentInventory();
    if (this.isGestionnaire) {
      this.loadStockValues();
    }
  }

  addItem(): void {
    this.saveState();
    this.router.navigate(['/inventory-add']);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadInventories();
  }

  loadCurrentInventory(): void {
    this.inventoryService.getCurrentInventory().subscribe({
      next: (inventory: InventoryDto | null) => {
        if (inventory && (inventory.status === 'IN_PROGRESS' || inventory.status === 'DRAFT')) {
          this.currentInventory = inventory;
        } else {
          this.currentInventory = null;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l\'inventaire en cours', err);
        this.currentInventory = null;
      }
    });
  }

  createInventory(): void {
    this.alertService.showConfirmation(
      'Confirmation de création d\'inventaire',
      'Voulez-vous créer un nouvel inventaire ? Cette action créera un point de contrôle pour tous les articles.'
    ).then((result: boolean) => {
      if (result) {
        this.isProcessing = true;
        this.inventoryService.createInventory().subscribe({
          next: (inventory: InventoryDto) => {
            this.isProcessing = false;
            if (inventory) {
              this.currentInventory = inventory;
              this.alertService.showDefaultSucces('Inventaire créé avec succès.');
            }
          },
          error: (err) => {
            this.isProcessing = false;
            const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la création de l\'inventaire.';
            this.alertService.showError(errorMessage);
            console.error(err);
          }
        });
      }
    });
  }

  downloadInventoryPdf(): void {
    if (!this.currentInventory?.id) {
      this.alertService.toastError('Aucun inventaire disponible pour télécharger.');
      return;
    }

    const inventoryId = this.currentInventory.id;
    this.isProcessing = true;
    this.inventoryService.downloadInventoryPdf(inventoryId).subscribe({
      next: (blob: Blob) => {
        this.isProcessing = false;
        const filename = `fiche_controle_inventaire_${inventoryId}.pdf`;
        saveAs(blob, filename);
        this.alertService.toastSuccess('PDF téléchargé avec succès.');
      },
      error: (err) => {
        this.isProcessing = false;
        this.alertService.toastError('Erreur lors du téléchargement du PDF.');
        console.error(err);
      }
    });
  }

  togglePhysicalInput(): void {
    if (!this.currentInventory?.id) {
      this.alertService.toastError('Aucun inventaire disponible.');
      return;
    }

    const dialogRef = this.dialog.open(PhysicalQuantityModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      data: { inventoryId: this.currentInventory.id },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.loadCurrentInventory();
      }
    });
  }

  navigateToReconciliation(): void {
    if (this.currentInventory?.id) {
      this.saveState();
      this.router.navigate(['/inventory-reconciliation', this.currentInventory.id]);
    }
  }

  finalizeInventory(): void {
    if (!this.currentInventory?.id) {
      this.alertService.toastError('Aucun inventaire disponible à clôturer.');
      return;
    }

    this.alertService.showConfirmation(
      'Confirmation de clôture d\'inventaire',
      'Êtes-vous sûr de vouloir clôturer cet inventaire ? Cette action est définitive et empêchera toute modification future.'
    ).then((result: boolean) => {
      if (result) {
        this.isProcessing = true;
        this.inventoryService.finalizeInventory(this.currentInventory!.id).subscribe({
          next: (response: { statusCode?: number; message?: string }) => {
            this.isProcessing = false;
            if (response?.statusCode && response.statusCode > 400) {
              this.alertService.toastError(response.message || 'Une erreur est survenue lors de la clôture de l\'inventaire.');
            } else {
              this.alertService.toastSuccess('Inventaire clôturé avec succès.');
              this.loadCurrentInventory();
            }
          },
          error: (err) => {
            this.isProcessing = false;
            const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la clôture de l\'inventaire.';
            this.alertService.toastError(errorMessage);
            console.error(err);
          }
        });
      }
    });
  }

  private saveState(): void {
    const state: InventoryListState = {
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
      const state = JSON.parse(saved) as InventoryListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste inventaire', e);
    }
  }
}
