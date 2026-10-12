import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  StockReceptionItem,
  StockReceptionValidateLine,
  StockReceptionValidateRequest
} from '../../../core/models/stock-reception.model';
import { StockReceptionService } from '../../services/stock-reception.service';

export interface StockReceptionValidateDialogData {
  receptionId: number;
  reference: string;
  canShowPurchasePrice: boolean;
}

interface EditablePriceState {
  unitPrice: number | null;
  packagePrice: number | null;
}

@Component({
  selector: 'app-stock-reception-validate-dialog',
  templateUrl: './stock-reception-validate-dialog.component.html',
  styleUrls: ['./stock-reception-validate-dialog.component.scss']
})
export class StockReceptionValidateDialogComponent implements OnInit {
  items: StockReceptionItem[] = [];
  editablePrices: Record<number, EditablePriceState> = {};
  loading = true;
  submitting = false;
  errorMessage: string | null = null;
  loadError: string | null = null;

  private readonly pageSize = 100;

  constructor(
    private dialogRef: MatDialogRef<StockReceptionValidateDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: StockReceptionValidateDialogData,
    private stockReceptionService: StockReceptionService
  ) {
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.loadAllItems();
  }

  get displayedTotalAmount(): number {
    return this.roundMoney(
      this.items.reduce((sum, item) => sum + this.displayLineTotal(item), 0)
    );
  }

  isPackagingMode(item: StockReceptionItem): boolean {
    return item.entryPackagingMode === 'WHOLESALE' || item.entryPackagingMode === 'HALF_WHOLESALE';
  }

  displayUnitPrice(item: StockReceptionItem): number {
    if (this.isPackagingMode(item)) {
      return this.derivedUnitPrice(item);
    }
    return this.editablePrices[item.id]?.unitPrice ?? item.unitPrice ?? 0;
  }

  displayPackagePrice(item: StockReceptionItem): number {
    return this.editablePrices[item.id]?.packagePrice ?? item.packagePrice ?? 0;
  }

  displayLineTotal(item: StockReceptionItem): number {
    if (this.isPackagingMode(item)) {
      return this.roundMoney(this.displayPackagePrice(item) * (item.packageCount ?? 0));
    }
    return this.roundMoney(this.displayUnitPrice(item) * (item.quantity ?? 0));
  }

  onUnitPriceChange(item: StockReceptionItem, raw: string | number | null): void {
    this.ensureEditable(item.id).unitPrice = this.parsePositiveNumber(raw);
    this.errorMessage = null;
  }

  onPackagePriceChange(item: StockReceptionItem, raw: string | number | null): void {
    this.ensureEditable(item.id).packagePrice = this.parsePositiveNumber(raw);
    this.errorMessage = null;
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
      return `${item.packageCount} ${typeLabel}${item.packageCount > 1 ? 's' : ''} × ${item.unitsPerPackageSnapshot} u`;
    }
    if (mode === 'HALF_WHOLESALE') {
      return `${item.packageCount} demi-${typeLabel}${item.packageCount > 1 ? 's' : ''} × ${item.unitsPerPackageSnapshot / 2} u`;
    }
    return null;
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.submitting || this.loading || this.loadError) {
      return;
    }

    const validationError = this.validateEditablePrices();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const body = this.buildValidateRequest();
    this.stockReceptionService.validateReception(this.data.receptionId, body).subscribe({
      next: () => {
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message
          || err?.error?.data?.message
          || 'Erreur lors de la validation. Corrigez les prix puis réessayez.';
      }
    });
  }

  private loadAllItems(): void {
    this.loading = true;
    this.loadError = null;

    this.stockReceptionService.getReceptionItems(this.data.receptionId, 0, this.pageSize).pipe(
      switchMap((first) => {
        const data = first?.data;
        const firstPage: StockReceptionItem[] = data?.content ?? [];
        const totalPages = data?.page?.totalPages ?? 1;
        if (totalPages <= 1) {
          return of(firstPage);
        }
        const requests = [];
        for (let page = 1; page < totalPages; page++) {
          requests.push(
            this.stockReceptionService.getReceptionItems(this.data.receptionId, page, this.pageSize).pipe(
              map(resp => (resp?.data?.content ?? []) as StockReceptionItem[])
            )
          );
        }
        return forkJoin(requests).pipe(
          map(pages => firstPage.concat(...pages))
        );
      }),
      catchError(() => {
        this.loadError = 'Impossible de charger les articles de la réception.';
        return of([] as StockReceptionItem[]);
      })
    ).subscribe(items => {
      this.items = items;
      this.editablePrices = {};
      for (const item of items) {
        this.initEditablePrice(item);
      }
      this.loading = false;
    });
  }

  private initEditablePrice(item: StockReceptionItem): void {
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
    if (this.items.length === 0) {
      return 'Aucun article à valider.';
    }
    if (!this.data.canShowPurchasePrice) {
      return null;
    }
    for (const item of this.items) {
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

  private buildValidateRequest(): StockReceptionValidateRequest | undefined {
    if (!this.data.canShowPurchasePrice) {
      return undefined;
    }
    const items: StockReceptionValidateLine[] = this.items.map(item => {
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

  private ensureEditable(itemId: number): EditablePriceState {
    if (!this.editablePrices[itemId]) {
      this.editablePrices[itemId] = { unitPrice: null, packagePrice: null };
    }
    return this.editablePrices[itemId];
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
