import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService, ApiResponse } from '../service/inventory.service';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Subscription } from 'rxjs';
import { StockFifoFeatureService } from 'src/app/stock/services/stock-fifo-feature.service';

@Component({
  selector: 'app-inventory-add',
  templateUrl: './inventory-add.component.html',
  styleUrls: ['./inventory-add.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class AddInventoryComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;
  private subscriptions: Subscription[] = [];

  inventoryForm: FormGroup;
  isSubmitting = false;
  currentDate = new Date();
  fifoEnabled = false;

  constructor(
    private formBuilder: FormBuilder,
    private inventoryService: InventoryService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private stockFifoFeatureService: StockFifoFeatureService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.inventoryForm = this.formBuilder.group({
      articles: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.stockFifoFeatureService.isFifoEnabled().subscribe(enabled => {
        this.fifoEnabled = enabled;
      })
    );
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.markFormGroupTouched(this.inventoryForm);
      this.alertService.showWarning('Veuillez sélectionner au moins un article', 'Formulaire invalide');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.inventoryForm.value;

    const payload = {
      articleEntries: formValue.articles.map((entry: {
        articleId: number;
        quantity?: number;
        unitPrice?: number;
        entryPackagingMode?: string;
        packageCount?: number;
        packagePrice?: number;
      }) => {
        const base: Record<string, unknown> = {
          articleId: entry.articleId,
          entryPackagingMode: entry.entryPackagingMode || 'UNIT'
        };
        if (entry.entryPackagingMode === 'WHOLESALE' || entry.entryPackagingMode === 'HALF_WHOLESALE') {
          base['packageCount'] = entry.packageCount;
          base['packagePrice'] = entry.packagePrice;
        } else {
          base['quantity'] = entry.quantity;
          if (entry.unitPrice != null) {
            base['unitPrice'] = entry.unitPrice;
          }
        }
        return base;
      })
    };

    const submitSub = this.inventoryService.addInventories(payload).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.alertService.showSuccess('Entrée enregistrée — en attente de validation du gestionnaire');
          this.router.navigate(['/stock/receptions']);
        } else {
          this.alertService.showError(response.message || 'Erreur lors de l\'ajout de l\'article');
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la soumission:', err);
        this.alertService.showError('Erreur lors de la soumission de l\'entrée de stock');
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(submitSub);
  }

  onCancel(): void {
    this.router.navigate(['/inventory/list']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
