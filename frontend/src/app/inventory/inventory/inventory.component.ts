import { Component, OnInit } from '@angular/core';
import { InventoryService, Inventory, ApiResponse, InventoryDto, InventoryItemDto } from '../service/inventory.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { PageEvent } from '@angular/material/paginator';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
// AJOUTÉ : Import du service et de l'interface nécessaires
import { ItemService, StockValues } from '../../article/service/item.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import {AuthService} from "../../auth/service/auth.service"; // AJOUTÉ : Importation de AlertService
import { saveAs } from 'file-saver';
import { MatDialog } from '@angular/material/dialog';
import { PhysicalQuantityModalComponent } from '../physical-quantity-modal/physical-quantity-modal.component';



@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  inventory: Inventory[] = [];
  filteredInventory: Inventory[] = [];
  searchTerm: string = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  // AJOUTÉ : Propriétés pour stocker les valeurs et vérifier le rôle
   stockValues: StockValues | null = null;
   isGestionnaire: boolean = false;

   // Nouvelles propriétés pour la gestion d'inventaire
   currentInventory: InventoryDto | null = null;

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private itemService: ItemService, // AJOUTÉ : Injection de ItemService
    private alertService: AlertService, // AJOUTÉ : Injection de AlertService
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.tokenStorage.checkConnectedUser();
    // AJOUTÉ : Logique pour vérifier si l'utilisateur est un gestionnaire
        try {
          const user = this.authService.getCurrentUser();
          if (user && user.roles && Array.isArray(user.roles)) {
            // Mettez ici un rôle qui est spécifique au gestionnaire
            this.isGestionnaire = user.roles.includes('ROLE_REPORT');
          }
        } catch (e) {
          console.error('Impossible de lire les informations utilisateur', e);
        }
  }

  ngOnInit(): void {
    this.loadInventories();
    this.loadCurrentInventory();
    // AJOUTÉ : On charge les valeurs du stock si l'utilisateur est un gestionnaire
        if (this.isGestionnaire) {
          this.loadStockValues();
        }
  }

 // AJOUTÉ : Nouvelle méthode pour charger les valeurs du stock
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
    this.spinner.show();
    const search = this.searchTerm.trim();
    const page = this.currentPage;
    const size = this.pageSize;

    const request$ = search
      ? this.inventoryService.searchInventories(search, page, size)
      : this.inventoryService.getInventories(page, size);

    request$.subscribe({
      next: (response: ApiResponse) => {
        if (response.status === 'OK' && response.statusCode === 200) {
          this.inventory = response.data.content;
          this.filteredInventory = [...this.inventory];
          this.totalElements = response.data.page.totalElements;
          this.pageSize = response.data.page.size;
        } else {
          console.error('Erreur: Réponse inattendue du serveur.');
        }
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des inventaires:', error);
        this.spinner.hide();
      }
    });
  }
  onSearch(): void {
    this.currentPage = 0; // Réinitialise à la première page
    this.loadInventories();
  }

  // AJOUTEZ CETTE NOUVELLE MÉTHODE
    resetAllStock(): void {
      // Demander confirmation à l'utilisateur
      this.alertService.showDeleteConfirmation(
        'Êtes-vous sûr de vouloir réinitialiser le stock de TOUS les articles à zéro ? Cette action est irréversible.'
      ).then((result: boolean) => {
        if (result) {
          this.spinner.show();
          this.itemService.resetAllStock().subscribe({
            next: () => {
              this.spinner.hide();
              this.alertService.showDefaultSucces('Le stock de tous les articles a été réinitialisé.');
              this.refresh(); // Recharger les données pour voir le changement
            },
            error: (err) => {
              this.spinner.hide();
              const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la réinitialisation.';
              this.alertService.showError(errorMessage);
              console.error(err);
            }
          });
        }
      });
    }

    // AJOUTEZ CETTE NOUVELLE MÉTHODE
    resetStockForArticle(articleId: number, articleName: string): void {
      this.alertService.showDeleteConfirmation(
        `Êtes-vous sûr de vouloir réinitialiser le stock de l'article "${articleName}" à zéro ?`
      ).then((result: boolean) => {
        if (result) {
          this.spinner.show();
          this.itemService.resetStockForArticle(articleId).subscribe({
            next: () => {
              this.spinner.hide();
              this.alertService.showDefaultSucces(`Le stock pour "${articleName}" a été réinitialisé.`);
              this.refresh(); // Recharger les données
            },
            error: (err) => {
              this.spinner.hide();
              this.alertService.showError('Une erreur est survenue.');
              console.error(err);
            }
          });
        }
      });
    }



  refresh(): void {
    this.spinner.show();
    this.loadInventories();
    setTimeout(() => {
      this.spinner.hide();
    }, 1000);
  }

  addItem(): void {
    this.router.navigate(['/inventory-add']);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex; // Index de la page actuelle
    this.pageSize = event.pageSize; // Taille de la page
    this.loadInventories(); // Recharger les inventaires
  }

  // Nouvelles méthodes pour la gestion d'inventaire
  loadCurrentInventory(): void {
    this.inventoryService.getCurrentInventory().subscribe({
      next: (inventory: any) => {
        if (inventory) {
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
    this.alertService.showConfirmation('Confirmation de création d\'inventaire',
      'Voulez-vous créer un nouvel inventaire ? Cette action créera un point de contrôle pour tous les articles.'
    ).then((result: boolean) => {
      if (result) {
        this.spinner.show();
        this.inventoryService.createInventory().subscribe({
          next: (inventory: any) => {
            this.spinner.hide();
            if (inventory) {
              this.currentInventory = inventory;
              this.alertService.showDefaultSucces('Inventaire créé avec succès.');
            }
          },
          error: (err) => {
            this.spinner.hide();
            const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la création de l\'inventaire.';
            this.alertService.showError(errorMessage);
            console.error(err);
          }
        });
      }
    });
  }


  downloadInventoryPdf(): void {
    if (!this.currentInventory || !this.currentInventory.id) {
      this.alertService.showError('Aucun inventaire disponible pour télécharger.');
      return;
    }

    if (!this.currentInventory || !this.currentInventory.id) {
      this.alertService.showError('Aucun inventaire disponible pour télécharger.');
      return;
    }

    const inventoryId = this.currentInventory.id;
    this.spinner.show();
    this.inventoryService.downloadInventoryPdf(inventoryId).subscribe({
      next: (blob: Blob) => {
        this.spinner.hide();
        const filename = `fiche_controle_inventaire_${inventoryId}.pdf`;
        saveAs(blob, filename);
        this.alertService.showDefaultSucces('PDF téléchargé avec succès.');
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du téléchargement du PDF.');
        console.error(err);
      }
    });
  }

  togglePhysicalInput(): void {
    if (!this.currentInventory || !this.currentInventory.id) {
      this.alertService.showError('Aucun inventaire disponible.');
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
        // Recharger l'inventaire pour mettre à jour les données
        this.loadCurrentInventory();
      }
    });
  }

  navigateToReconciliation(): void {
    if (this.currentInventory && this.currentInventory.id) {
      this.router.navigate(['/inventory-reconciliation', this.currentInventory.id]);
    }
  }
}
