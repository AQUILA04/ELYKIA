import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/service/auth.service';
import { UserService } from '../../user/service/user.service';
import { UserProfile } from '../../shared/models/user-profile.enum';
import { ClientService } from '../../client/service/client.service';
import { CommercialStockService } from '../services/commercial-stock.service';
import { RattrapageCreditService } from '../services/rattrapage-credit.service';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';

/** Item sélectionné pour la distribution */
interface SelectedItem {
  stockItemId: number;
  articleId: number;
  articleName: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-rattrapage-credit-add',
  templateUrl: './rattrapage-credit-add.component.html',
  styleUrls: ['./rattrapage-credit-add.component.scss']
})
export class RattrapageCreditAddComponent implements OnInit, OnDestroy {

  rattrapageForm!: FormGroup;
  isLoading = false;
  loadingMonths = false;
  currentStep = 1;

  // Données
  commercials: any[] = [];
  clients: any[] = [];
  residualStocks: CommercialMonthlyStock[] = [];

  // Sélections
  selectedCommercial: string | null = null;
  selectedStockId: number | null = null;
  selectedStockMonth: CommercialMonthlyStock | null = null;
  selectedItems: SelectedItem[] = [];

  // Calculs
  totalAmount = 0;
  totalQty = 0;
  remainingAmount = 0;
  computedEndDate: Date | null = null;
  computedDays: number | null = null;

  // Rôles
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
    private commercialStockService: CommercialStockService,
    private rattrapageCreditService: RattrapageCreditService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);

    this.buildForm();
    this.loadInitialData();
  }

  private buildForm(): void {
    this.rattrapageForm = this.fb.group({
      commercial: [null, this.isPromoter ? [] : [Validators.required]],
      clientId: [null, [Validators.required]],
      selectedItems: [[], [Validators.required, Validators.minLength(1)]],
      beginDate: [new Date().toISOString().split('T')[0], [Validators.required]],
      dailyStake: [null, [Validators.required, Validators.min(200)]],
      advance: [0, [Validators.min(0)]],
      note: ['']
    });

    if (this.isPromoter) {
      this.selectedCommercial = this.currentUser.username;
      this.rattrapageForm.patchValue({ commercial: this.currentUser.username });
      this.rattrapageForm.get('commercial')?.disable();
    }
  }

  private loadInitialData(): void {
    this.spinner.show();
    const obs: any = { commercials: this.clientService.getAgents() };

    if (this.isPromoter) {
      obs['clients'] = this.clientService.getClientByCommercial(this.currentUser.username, 0, 1000, 'firstname,asc').pipe(map((res: any) => res.data?.content || res.content || res || []));
    }

    forkJoin(obs)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (data: any) => {
          this.commercials = data.commercials;
          if (data.clients) {
            this.clients = data.clients;
          }
          if (this.isPromoter) {
            this.loadResidualStocks(this.currentUser.username);
          }
        },
        error: () => this.toastr.error('Erreur lors du chargement des données')
      });
  }

  // ─── Sélection commercial ────────────────────────────────────────────────

  onCommercialChange(): void {
    const commercial = this.rattrapageForm.get('commercial')?.value;
    this.selectedCommercial = commercial;

    // Reset des étapes suivantes
    this.rattrapageForm.patchValue({ clientId: null, selectedItems: [] });
    this.residualStocks = [];
    this.selectedStockMonth = null;
    this.selectedStockId = null;
    this.selectedItems = [];
    this.clients = [];
    this.recalculateTotals();

    if (commercial) {
      this.currentStep = 2;
      this.spinner.show();
      forkJoin({
        clients: this.clientService.getClientByCommercial(commercial, 0, 1000, 'firstname,asc').pipe(map((res: any) => res.data?.content || res.content || res || [])),
      }).pipe(finalize(() => this.spinner.hide())).subscribe({
        next: (data: any) => {
          this.clients = data.clients;
          this.loadResidualStocks(commercial);
        },
        error: () => this.toastr.error('Erreur lors du chargement des données du commercial')
      });
    }
  }

  // ─── Stocks résiduels ────────────────────────────────────────────────────

  loadResidualStocks(username: string): void {
    this.loadingMonths = true;
    this.residualStocks = [];

    this.rattrapageCreditService.getResidualStocks(username)
      .pipe(finalize(() => this.loadingMonths = false))
      .subscribe({
        next: (stocks) => {
          this.residualStocks = stocks;
        },
        error: () => this.toastr.error('Erreur lors du chargement des stocks antérieurs')
      });
  }

  onStockMonthSelect(stock: CommercialMonthlyStock): void {
    this.selectedStockId = stock.id ?? null;
    this.selectedStockMonth = stock;
    this.selectedItems = [];
    this.rattrapageForm.patchValue({ selectedItems: [] });
    this.recalculateTotals();
    this.currentStep = 3;
  }

  // ─── Sélection articles ──────────────────────────────────────────────────

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
        unitPrice: item.weightedAverageUnitPrice
      });
    } else {
      this.selectedItems = this.selectedItems.filter(s => s.stockItemId !== item.id);
    }

    this.updateSelectedItemsControl();
    this.recalculateTotals();
    if (this.selectedItems.length > 0) {
      this.currentStep = 4;
    }
  }

  onQtyChange(item: any, event: Event): void {
    const qty = parseInt((event.target as HTMLInputElement).value, 10);
    const found = this.selectedItems.find(s => s.stockItemId === item.id);
    if (found && qty > 0 && qty <= item.quantityRemaining) {
      found.quantity = qty;
      this.recalculateTotals();
    }
  }

  private updateSelectedItemsControl(): void {
    this.rattrapageForm.patchValue({ selectedItems: this.selectedItems });
    this.rattrapageForm.get('selectedItems')?.updateValueAndValidity();
  }

  // ─── Calculs dynamiques ─────────────────────────────────────────────────

  recalculateTotals(): void {
    this.totalQty = this.selectedItems.reduce((acc, i) => acc + i.quantity, 0);
    this.totalAmount = this.selectedItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const advance = this.rattrapageForm.get('advance')?.value || 0;
    this.remainingAmount = Math.max(0, this.totalAmount - advance);
    this.recalculateEndDate();
  }

  recalculateEndDate(): void {
    const beginDateStr = this.rattrapageForm.get('beginDate')?.value;
    const dailyStake = this.rattrapageForm.get('dailyStake')?.value;
    const advance = this.rattrapageForm.get('advance')?.value || 0;

    this.remainingAmount = Math.max(0, this.totalAmount - advance);

    if (beginDateStr && dailyStake && dailyStake > 0 && this.remainingAmount > 0) {
      this.computedDays = Math.ceil(this.remainingAmount / dailyStake);
      const start = new Date(beginDateStr);
      const end = new Date(start);
      end.setDate(end.getDate() + this.computedDays);
      this.computedEndDate = end;
    } else if (this.remainingAmount === 0 && beginDateStr) {
      this.computedEndDate = new Date(beginDateStr);
      this.computedDays = 0;
    } else {
      this.computedEndDate = null;
      this.computedDays = null;
    }
  }

  // ─── Helpers affichage ───────────────────────────────────────────────────

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
      (acc, i) => acc + (i.quantityRemaining * i.weightedAverageUnitPrice),
      0
    ) || 0;
  }

  searchCommercial = (term: string, item: any): boolean =>
    item.username.toLowerCase().includes(term.toLowerCase());

  searchClient = (term: string, item: any): boolean => {
    const full = `${item.firstname} ${item.lastname}`.toLowerCase();
    return full.includes(term.toLowerCase());
  };

  // ─── Soumission ──────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.rattrapageForm.invalid || this.selectedItems.length === 0) {
      Object.keys(this.rattrapageForm.controls).forEach(k =>
        this.rattrapageForm.get(k)?.markAsTouched()
      );
      this.toastr.warning('Veuillez remplir tous les champs requis', 'Formulaire incomplet');
      return;
    }

    this.isLoading = true;
    this.spinner.show();

    const formVal = this.rattrapageForm.getRawValue();

    const payload = {
      commercial: formVal.commercial || this.currentUser.username,
      clientId: formVal.clientId,
      sourceStockId: this.selectedStockId || 0,
      beginDate: formVal.beginDate,
      dailyStake: formVal.dailyStake,
      advance: formVal.advance || 0,
      note: formVal.note,
      expectedEndDate: this.computedEndDate?.toISOString().split('T')[0],
      items: this.selectedItems.map(i => ({
        stockItemId: i.stockItemId,
        articleId: i.articleId,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    this.rattrapageCreditService.createRattrapage(payload)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.spinner.hide();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Distribution de rattrapage enregistrée avec succès');
          this.router.navigate(['/credit-list']);
        },
        error: (err) => {
          this.toastr.error(
            err.error?.message || 'Erreur lors de la création du rattrapage',
            'Erreur'
          );
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
