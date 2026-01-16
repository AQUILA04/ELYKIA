import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InventoryService, InventoryItemDto } from '../service/inventory.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-physical-quantity-modal',
  templateUrl: './physical-quantity-modal.component.html',
  styleUrls: ['./physical-quantity-modal.component.scss']
})
export class PhysicalQuantityModalComponent implements OnInit {
  inventoryItems: InventoryItemDto[] = [];
  physicalQuantities: { [articleId: number]: number } = {};
  inventoryId: number;

  constructor(
    public dialogRef: MatDialogRef<PhysicalQuantityModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { inventoryId: number },
    private inventoryService: InventoryService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) {
    this.inventoryId = data.inventoryId;
  }

  ngOnInit(): void {
    this.loadInventoryItems();
  }

  loadInventoryItems(): void {
    this.spinner.show();
    this.inventoryService.getInventoryItems(this.inventoryId).subscribe({
      next: (items: InventoryItemDto[]) => {
        console.log('Articles chargés:', items);
        if (items && Array.isArray(items)) {
          this.inventoryItems = items;
          // Initialiser les quantités physiques avec les valeurs existantes ou système
          items.forEach(item => {
            if (item.physicalQuantity !== null && item.physicalQuantity !== undefined) {
              this.physicalQuantities[item.articleId] = item.physicalQuantity;
            } else {
              this.physicalQuantities[item.articleId] = item.systemQuantity || 0;
            }
          });
        } else {
          this.inventoryItems = [];
          this.alertService.showError('Aucun article trouvé pour cet inventaire.');
        }
        this.spinner.hide();
      },
      error: (err) => {
        this.spinner.hide();
        console.error('Erreur détaillée:', err);
        const errorMessage = err?.error?.message || 'Erreur lors du chargement des articles.';
        this.alertService.showError(errorMessage);
      }
    });
  }

  calculateDifference(articleId: number, systemQuantity: number): number {
    const physicalQty = this.physicalQuantities[articleId] || 0;
    return physicalQty - systemQuantity;
  }

  onSubmit(): void {
    // Vérifier que toutes les quantités sont renseignées
    const missingQuantities = this.inventoryItems.filter(item => {
      const qty = this.physicalQuantities[item.articleId];
      return qty === null || qty === undefined || qty < 0;
    });

    if (missingQuantities.length > 0) {
      this.alertService.showError('Veuillez renseigner toutes les quantités physiques (valeurs >= 0).');
      return;
    }

    this.alertService.showConfirmation('Confirmation Quantité Physique',
      'Voulez-vous soumettre les quantités physiques ? Cette action mettra à jour l\'inventaire.'
    ).then((result: boolean) => {
      if (result) {
        this.spinner.show();
        this.inventoryService.submitPhysicalQuantities(this.inventoryId, this.physicalQuantities).subscribe({
          next: (response: any) => {
            this.spinner.hide();
            this.alertService.showDefaultSucces('Quantités physiques soumises avec succès.');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.spinner.hide();
            const errorMessage = err?.error?.message || 'Une erreur est survenue lors de la soumission.';
            this.alertService.showError(errorMessage);
            console.error(err);
          }
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

