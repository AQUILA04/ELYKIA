import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { InventoryService } from 'src/app/inventory/service/inventory.service';
import { Article } from 'src/app/article/service/item.service';

export interface QuickStockEntryData {
    article: Article;
}

@Component({
    selector: 'app-quick-stock-entry',
    templateUrl: './quick-stock-entry.component.html',
    styleUrls: ['./quick-stock-entry.component.scss'],
    standalone: false
})
export class QuickStockEntryComponent {
    form: FormGroup;
    isSubmitting = false;

    constructor(
        public dialogRef: MatDialogRef<QuickStockEntryComponent>,
        @Inject(MAT_DIALOG_DATA) public data: QuickStockEntryData,
        private fb: FormBuilder,
        private inventoryService: InventoryService,
        private spinner: NgxSpinnerService,
        private alertService: AlertService
    ) {
        this.form = this.fb.group({
            quantity: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]]
        });
    }

    get article(): Article {
        return this.data.article;
    }

    get quantityControl() {
        return this.form.get('quantity');
    }

    get newTotal(): number {
        const q = Number(this.quantityControl?.value) || 0;
        return (this.article.stockQuantity ?? 0) + q;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        this.spinner.show();

        const payload = {
            articleEntries: [
                {
                    articleId: this.article.id,
                    quantity: Number(this.quantityControl?.value)
                }
            ]
        };

        this.inventoryService.addInventories(payload).subscribe({
            next: (response) => {
                this.spinner.hide();
                this.isSubmitting = false;
                if (response.statusCode === 200 || response.status === 'OK' || response.statusCode === undefined) {
                    this.alertService.showSuccess('Entrée de stock enregistrée avec succès');
                    this.dialogRef.close({ success: true, quantity: Number(this.quantityControl?.value) });
                } else {
                    this.alertService.showError(response.message || 'Erreur lors de l\'entrée de stock');
                    this.dialogRef.close({ success: false });
                }
            },
            error: (err) => {
                this.spinner.hide();
                this.isSubmitting = false;
                console.error('Erreur entrée de stock:', err);
                this.alertService.showError('Erreur lors de l\'entrée de stock');
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close(null);
    }
}
