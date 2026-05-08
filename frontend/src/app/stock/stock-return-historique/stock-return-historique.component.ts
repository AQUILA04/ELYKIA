import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../auth/service/auth.service';
import { UserService } from '../../user/service/user.service';
import { ClientService } from '../../client/service/client.service';
import { StockReturnService } from '../services/stock-return.service';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';
import { UserProfile } from '../../shared/models/user-profile.enum';
import { StockReturnDto } from '../models/stock-return.model';

interface ReturnSelectedItem {
  stockItemId: number;
  articleId: number;
  articleName: string;
  quantity: number;
  unitPrice: number;
  maxQuantity: number;
}

@Component({
  selector: 'app-stock-return-historique',
  templateUrl: './stock-return-historique.component.html',
  styleUrls: ['../rattrapage/rattrapage-credit-add.component.scss'] // Reusing styles from rattrapage
})
export class StockReturnHistoriqueComponent implements OnInit, OnDestroy {
  currentStep = 1;
  isLoading = false;
  loadingStocks = false;

  returnForm!: FormGroup;

  commercials: any[] = [];
  selectedCommercial: string | null = null;
  historicalStocks: CommercialMonthlyStock[] = [];
  selectedStock: CommercialMonthlyStock | null = null;
  selectedItems: ReturnSelectedItem[] = [];

  totalReturnValue = 0;
  totalQty = 0;

  isPromoter = false;
  isManager = false;
  currentUser: any;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private authService: AuthService,
    private userService: UserService,
    private clientService: ClientService,
    private stockReturnService: StockReturnService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN)
      || this.userService.hasProfile(UserProfile.SECRETARY);

    this.buildForm();
    this.loadCommercials();
  }

  private buildForm(): void {
    this.returnForm = this.fb.group({
      commercial: [null, this.isPromoter ? [] : [Validators.required]],
      selectedItems: [[], [Validators.required, Validators.minLength(1)]],
      returnDate: [new Date().toISOString().split('T')[0], [Validators.required]],
      note: ['']
    });

    if (this.isPromoter) {
      this.selectedCommercial = this.currentUser.username;
      this.returnForm.patchValue({ commercial: this.currentUser.username });
      this.returnForm.get('commercial')?.disable();
      this.loadHistoricalStocks(this.currentUser.username);
      this.currentStep = 2;
    }
  }

  private loadCommercials(): void {
    if (!this.isPromoter) {
      this.spinner.show();
      const sub = this.clientService.getAgents().pipe(finalize(() => this.spinner.hide()))
        .subscribe({
          next: (data: any) => this.commercials = data,
          error: () => this.toastr.error('Erreur lors du chargement des commerciaux')
        });
      this.subscriptions.push(sub);
    }
  }

  onCommercialChange(): void {
    const commercial = this.returnForm.get('commercial')?.value;
    this.selectedCommercial = commercial;

    // Reset des étapes suivantes
    this.returnForm.patchValue({ selectedItems: [] });
    this.historicalStocks = [];
    this.selectedStock = null;
    this.selectedItems = [];
    this.recalculateTotals();

    if (commercial) {
      this.currentStep = 2;
      this.loadHistoricalStocks(commercial);
    }
  }

  loadHistoricalStocks(username: string): void {
    this.loadingStocks = true;
    this.historicalStocks = [];

    const sub = this.stockReturnService.getHistoricalStocks(username)
      .pipe(finalize(() => this.loadingStocks = false))
      .subscribe({
        next: (stocks) => {
          this.historicalStocks = stocks;
        },
        error: () => this.toastr.error('Erreur lors du chargement des stocks antérieurs')
      });
    this.subscriptions.push(sub);
  }

  onStockSelect(stock: CommercialMonthlyStock): void {
    this.selectedStock = stock;
    this.selectedItems = [];
    this.returnForm.patchValue({ selectedItems: [] });
    this.recalculateTotals();
    this.currentStep = 3;
  }

  isItemSelected(item: any): boolean {
    return this.selectedItems.some(s => s.stockItemId === item.id);
  }

  getSelectedQty(item: any): number {
    const found = this.selectedItems.find(s => s.stockItemId === item.id);
    return found ? found.quantity : 0;
  }

  toggleArticle(item: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedItems.push({
        stockItemId: item.id,
        articleId: item.article.id,
        articleName: `${item.article.commercialName} ${item.article.name}`,
        quantity: 1,
        unitPrice: item.weightedAverageUnitPrice || 0,
        maxQuantity: item.quantityRemaining
      });
    } else {
      this.selectedItems = this.selectedItems.filter(s => s.stockItemId !== item.id);
    }

    this.updateSelectedItemsControl();
    this.recalculateTotals();
  }

  onQtyChange(item: any, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const qty = parseInt(val, 10);
    const found = this.selectedItems.find(s => s.stockItemId === item.id);

    if (found) {
        if (qty > 0 && qty <= item.quantityRemaining) {
          found.quantity = qty;
          this.recalculateTotals();
        } else {
          // Revert to last valid quantity
          (event.target as HTMLInputElement).value = found.quantity.toString();
        }
    }
  }

  private updateSelectedItemsControl(): void {
    this.returnForm.patchValue({ selectedItems: this.selectedItems });
    this.returnForm.get('selectedItems')?.updateValueAndValidity();
  }

  recalculateTotals(): void {
    this.totalQty = this.selectedItems.reduce((acc, i) => acc + i.quantity, 0);
    this.totalReturnValue = this.selectedItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  }

  getMonthName(monthNumber: number): string {
    const d = new Date();
    d.setMonth(monthNumber - 1);
    return d.toLocaleString('fr-FR', { month: 'long' });
  }

  getTotalResidualItems(stock: CommercialMonthlyStock): number {
    return stock.items?.filter(i => i.quantityRemaining > 0).length || 0;
  }

  getTotalResidualQty(stock: CommercialMonthlyStock): number {
    return stock.items?.reduce((acc, i) => acc + (i.quantityRemaining || 0), 0) || 0;
  }

  getTotalStockValue(stock: CommercialMonthlyStock): number {
    return stock.items?.reduce(
      (acc, i) => acc + (i.quantityRemaining * (i.weightedAverageUnitPrice || 0)),
      0
    ) || 0;
  }

  onSubmit(): void {
    if (this.returnForm.invalid || this.selectedItems.length === 0) {
      Object.keys(this.returnForm.controls).forEach(k =>
        this.returnForm.get(k)?.markAsTouched()
      );
      this.toastr.warning('Veuillez remplir tous les champs requis', 'Formulaire incomplet');
      return;
    }

    this.isLoading = true;
    this.spinner.show();

    const formVal = this.returnForm.getRawValue();

    const payload: StockReturnDto = {
      commercial: formVal.commercial || this.currentUser.username,
      targetStockId: this.selectedStock!.id!,
      returnDate: formVal.returnDate,
      note: formVal.note,
      items: this.selectedItems.map(i => ({
        stockItemId: i.stockItemId,
        articleId: i.articleId,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    const sub = this.stockReturnService.createHistoriqueReturn(payload)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.spinner.hide();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Retour en stock historique enregistré avec succès');
          this.router.navigate(['/stock/my-stock']);
        },
        error: (err) => {
          this.toastr.error(
            err.error?.message || 'Erreur lors de la création du retour',
            'Erreur'
          );
        }
      });

    this.subscriptions.push(sub);
  }

  onCancel(): void {
    this.router.navigate(['/stock/my-stock']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
