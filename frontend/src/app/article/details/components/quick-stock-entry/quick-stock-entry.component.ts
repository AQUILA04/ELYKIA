import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { InventoryService } from 'src/app/inventory/service/inventory.service';
import { Article } from 'src/app/article/service/item.service';
import { StockFifoFeatureService } from 'src/app/stock/services/stock-fifo-feature.service';

export interface QuickStockEntryData {
    article: Article;
}

type EntryPackagingMode = 'UNIT' | 'WHOLESALE' | 'HALF_WHOLESALE';

@Component({
    selector: 'app-quick-stock-entry',
    templateUrl: './quick-stock-entry.component.html',
    styleUrls: ['./quick-stock-entry.component.scss'],
    standalone: false
})
export class QuickStockEntryComponent implements OnInit {
    form: FormGroup;
    isSubmitting = false;
    fifoEnabled = false;

    constructor(
        public dialogRef: MatDialogRef<QuickStockEntryComponent>,
        @Inject(MAT_DIALOG_DATA) public data: QuickStockEntryData,
        private fb: FormBuilder,
        private inventoryService: InventoryService,
        private spinner: NgxSpinnerService,
        private alertService: AlertService,
        private stockFifoFeatureService: StockFifoFeatureService
    ) {
        this.form = this.fb.group({
            entryPackagingMode: ['UNIT' as EntryPackagingMode],
            quantity: [null, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]],
            unitPrice: [data.article.purchasePrice ?? null],
            packageCount: [null],
            packagePrice: [null]
        });
    }

    ngOnInit(): void {
        this.stockFifoFeatureService.isFifoEnabled().subscribe(enabled => {
            this.fifoEnabled = enabled;
            this.applyModeValidators();
        });
        this.form.get('entryPackagingMode')?.valueChanges.subscribe(() => {
            this.prefillPackagePrice();
            this.applyModeValidators();
        });
    }

    get article(): Article {
        return this.data.article;
    }

    get hasPackaging(): boolean {
        return !!this.article.packagingType
            && this.article.packagingType !== 'NONE'
            && (this.article.unitsPerPackage ?? 0) >= 2;
    }

    get packagingLabel(): string {
        if (this.article.packagingType === 'SAC') {
            return 'sac';
        }
        if (this.article.packagingType === 'CARTON') {
            return 'carton';
        }
        return 'colis';
    }

    get isPackageMode(): boolean {
        const mode = this.form.get('entryPackagingMode')?.value;
        return mode === 'WHOLESALE' || mode === 'HALF_WHOLESALE';
    }

    get quantityControl() {
        return this.form.get('quantity');
    }

    get unitPriceControl() {
        return this.form.get('unitPrice');
    }

    get computedQuantity(): number {
        const mode = this.form.get('entryPackagingMode')?.value as EntryPackagingMode;
        if (!mode || mode === 'UNIT') {
            return Number(this.quantityControl?.value) || 0;
        }
        const packageCount = Number(this.form.get('packageCount')?.value) || 0;
        const units = this.article.unitsPerPackage || 0;
        if (!units || !packageCount) {
            return 0;
        }
        const unitsInMode = mode === 'WHOLESALE' ? units : units / 2;
        return packageCount * unitsInMode;
    }

    get computedUnitPrice(): number {
        const mode = this.form.get('entryPackagingMode')?.value as EntryPackagingMode;
        if (!mode || mode === 'UNIT') {
            return Number(this.unitPriceControl?.value) || 0;
        }
        const packagePrice = Number(this.form.get('packagePrice')?.value) || 0;
        const units = this.article.unitsPerPackage || 0;
        if (!units || packagePrice <= 0) {
            return 0;
        }
        const unitsInMode = mode === 'WHOLESALE' ? units : units / 2;
        return Math.round((packagePrice / unitsInMode) * 100) / 100;
    }

    get newTotal(): number {
        return (this.article.stockQuantity ?? 0) + this.computedQuantity;
    }

    private prefillPackagePrice(): void {
        const mode = this.form.get('entryPackagingMode')?.value as EntryPackagingMode;
        if (mode === 'WHOLESALE' && this.article.wholesalePurchasePrice) {
            this.form.patchValue({ packagePrice: this.article.wholesalePurchasePrice }, { emitEvent: false });
        } else if (mode === 'HALF_WHOLESALE' && this.article.halfWholesalePurchasePrice) {
            this.form.patchValue({ packagePrice: this.article.halfWholesalePurchasePrice }, { emitEvent: false });
        }
    }

    private applyModeValidators(): void {
        const mode = (this.form.get('entryPackagingMode')?.value as EntryPackagingMode) || 'UNIT';
        const quantityControl = this.form.get('quantity');
        const unitPriceControl = this.form.get('unitPrice');
        const packageCountControl = this.form.get('packageCount');
        const packagePriceControl = this.form.get('packagePrice');

        if (!this.fifoEnabled || mode === 'UNIT') {
            quantityControl?.setValidators([Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]);
            if (this.fifoEnabled) {
                unitPriceControl?.setValidators([Validators.required, Validators.min(0.01)]);
                unitPriceControl?.setValue(this.article.purchasePrice ?? null, { emitEvent: false });
            } else {
                unitPriceControl?.clearValidators();
            }
            packageCountControl?.clearValidators();
            packagePriceControl?.clearValidators();
        } else {
            quantityControl?.clearValidators();
            unitPriceControl?.clearValidators();
            packageCountControl?.setValidators([Validators.required, Validators.min(1)]);
            packagePriceControl?.setValidators([Validators.required, Validators.min(0.01)]);
        }
        quantityControl?.updateValueAndValidity({ emitEvent: false });
        unitPriceControl?.updateValueAndValidity({ emitEvent: false });
        packageCountControl?.updateValueAndValidity({ emitEvent: false });
        packagePriceControl?.updateValueAndValidity({ emitEvent: false });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        this.spinner.show();

        const mode = (this.form.get('entryPackagingMode')?.value as EntryPackagingMode) || 'UNIT';
        const entry: Record<string, unknown> = {
            articleId: this.article.id
        };

        if (this.fifoEnabled && (mode === 'WHOLESALE' || mode === 'HALF_WHOLESALE')) {
            entry['entryPackagingMode'] = mode;
            entry['packageCount'] = Number(this.form.get('packageCount')?.value);
            entry['packagePrice'] = Number(this.form.get('packagePrice')?.value);
        } else {
            entry['quantity'] = Number(this.quantityControl?.value);
            if (this.fifoEnabled) {
                entry['entryPackagingMode'] = 'UNIT';
                entry['unitPrice'] = Number(this.unitPriceControl?.value);
            }
        }

        const payload = {
            articleEntries: [entry]
        };

        this.inventoryService.addInventories(payload).subscribe({
            next: (response) => {
                this.spinner.hide();
                this.isSubmitting = false;
                if (response.statusCode === 200 || response.status === 'OK' || response.statusCode === undefined) {
                    this.alertService.showSuccess('Entrée enregistrée — en attente de validation du gestionnaire');
                    this.dialogRef.close({ success: true, quantity: this.computedQuantity, pending: true });
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
