import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  startWith,
  map
} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { OrderService } from '../../services/order.service';
import {
  Order,
  OrderClient,
  OrderArticle,
  CreateOrderDto,
  UpdateOrderDto,
  OrderStatus,
  ORDER_VALIDATION_MESSAGES,
  calculateItemTotal
} from '../../types/order.types';
import { OrderConfirmationModalComponent } from '../../components/modals/order-confirmation-modal/order-confirmation-modal.component';

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  orderForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  orderId: number | null = null;
  currentOrder: Order | null = null;
  clients$: Observable<OrderClient[]> = of([]);
  articles$: Observable<OrderArticle[]> = of([]);
  filteredClients$: Observable<OrderClient[]> = of([]);
  filteredArticles$: Observable<OrderArticle[]> = of([]);
  validationMessages = ORDER_VALIDATION_MESSAGES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.orderForm = this.createForm();
    this.setupFormSubscriptions();
  }

  ngOnInit(): void {
    this.determineMode();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private determineMode(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.orderId = +params['id'];
        this.loadOrderForEdit();
      }
    });
  }

  private loadInitialData(): void {
    this.clients$ = this.orderService.searchClients().pipe(map(response => response.data || []), takeUntil(this.destroy$));
    this.articles$ = this.orderService.searchArticles().pipe(map(response => response.data || []), takeUntil(this.destroy$));
    this.filteredClients$ = this.orderForm.get('clientSearch')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.orderService.searchClients(value).pipe(map(response => response.data || []));
        }
        return this.clients$;
      })
    );
  }

  private loadOrderForEdit(): void {
    if (!this.orderId) return;
    this.isLoading = true;
    this.orderService.getOrderById(this.orderId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.data) {
          this.currentOrder = response.data;
          this.populateForm(response.data);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('Erreur lors du chargement de la commande');
        this.router.navigate(['/orders']);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      clientId: [null, [Validators.required]],
      clientSearch: [''],
      selectedClient: [null],
      items: this.fb.array([], [Validators.required, this.minItemsValidator])
    });
  }

  private setupFormSubscriptions(): void {
    this.itemsFormArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calculateTotal());
  }

  private populateForm(order: Order): void {
    if (order.status !== OrderStatus.PENDING) {
      this.showError('Cette commande ne peut pas être modifiée dans son état actuel');
      this.router.navigate(['/orders']);
      return;
    }
    const clientName = `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim();
    this.orderForm.patchValue({
      clientId: order.client?.id,
      clientSearch: clientName,
      selectedClient: order.client
    });
    this.clearItems();
    (order.items || []).forEach(item => this.addItemFromOrder(item));
  }

  private addItemFromOrder(orderItem: any): void {
    const article = orderItem.article;
    if (!article) return;
    const itemForm = this.fb.group({
      articleId: [article.id, [Validators.required]],
      article: [article],
      quantity: [orderItem.quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [orderItem.unitPrice, [Validators.required, Validators.min(0)]],
      totalPrice: [orderItem.quantity * orderItem.unitPrice]
    });
    this.itemsFormArray.push(itemForm);
  }

  get itemsFormArray(): FormArray { return this.orderForm.get('items') as FormArray; }
  get totalAmount(): number { return this.itemsFormArray.controls.reduce((total, control) => total + (control.get('totalPrice')?.value || 0), 0); }
  get isFormValid(): boolean { return this.orderForm.valid && this.itemsFormArray.length > 0; }
  get pageTitle(): string { return this.isEditMode ? 'Modifier la Commande' : 'Créer une Commande'; }
  get submitButtonText(): string {
    if (this.isSaving) return this.isEditMode ? 'Modification...' : 'Création...';
    return this.isEditMode ? 'Modifier la Commande' : 'Créer la Commande';
  }

  displayClient(client: OrderClient): string {
    if (!client) return '';
    const code = client.code || `ID: ${client.id}`;
    return `${client.firstname} ${client.lastname} (${code})`;
  }

  onClientSelected(client: OrderClient): void { this.orderForm.patchValue({ clientId: client.id, selectedClient: client }); }
  onClientInputFocus(): void {
    if (!this.orderForm.get('clientSearch')?.value) this.filteredClients$ = this.clients$;
  }
  clearClientSelection(): void { this.orderForm.patchValue({ clientId: null, clientSearch: '', selectedClient: null }); }

  addItem(): void {
    const itemForm = this.fb.group({
      articleId: [null, [Validators.required]],
      article: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0],
      totalPrice: [0]
    });
    itemForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calculateItemTotal(itemForm));
    this.itemsFormArray.push(itemForm);
  }

  removeItem(index: number): void { this.itemsFormArray.removeAt(index); }
  clearItems(): void { while (this.itemsFormArray.length) this.itemsFormArray.removeAt(0); }

  onArticleSelected(article: OrderArticle, itemForm: AbstractControl): void {
    const unitPrice = article.creditSalePrice || article.unitPrice || 0;
    itemForm.patchValue({ articleId: article.id, article: article, unitPrice: unitPrice });
    this.calculateItemTotal(itemForm as FormGroup);
  }

  private calculateItemTotal(itemForm: FormGroup): void {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    itemForm.get('totalPrice')?.setValue(calculateItemTotal(quantity, unitPrice), { emitEvent: false });
  }

  private calculateTotal(): void { this.cdr.detectChanges(); }

  searchArticles(searchTerm: string): Observable<OrderArticle[]> {
    if (searchTerm.length < 2) return of([]);
    return this.orderService.searchArticles(searchTerm).pipe(map(response => response.data || []));
  }

  onArticleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filteredArticles$ = target?.value ? this.searchArticles(target.value) : of([]);
  }

  get totalQuantity(): number { return this.itemsFormArray.controls.reduce((total, control) => total + (control.get('quantity')?.value || 0), 0); }
  displayArticle(article: OrderArticle): string { return article ? `${article.name} (${article.code})` : ''; }
  getArticlePrice(article: OrderArticle): number { return article.creditSalePrice || article.unitPrice || 0; }

  private minItemsValidator(control: AbstractControl): { [key: string]: any } | null { return (control as FormArray).length > 0 ? null : { minItems: true }; }
  hasError(controlName: string, errorType: string): boolean {
    const control = this.orderForm.get(controlName);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }
  getErrorMessage(controlName: string): string {
    const control = this.orderForm.get(controlName);
    if (!control?.errors) return '';
    if (control.hasError('required')) return this.validationMessages.CLIENT_REQUIRED;
    return '';
  }

  onSubmit(): void {
    if (!this.isFormValid || this.isSaving) return;
    const formValue = this.orderForm.value;
    if (this.isEditMode) this.updateOrder(formValue); else this.createOrder(formValue);
  }

  private createOrder(formValue: any): void {
    const orderData: CreateOrderDto = {
      clientId: formValue.clientId,
      items: formValue.items.map((item: any) => ({ articleId: item.articleId, quantity: item.quantity }))
    };
    this.isSaving = true;
    this.orderService.createOrder(orderData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess('Commande créée avec succès');
        this.router.navigate(['/orders']);
      },
      error: (err: any) => {
        this.showError(err.message || 'Erreur lors de la création de la commande');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateOrder(formValue: any): void {
    if (!this.orderId || !this.currentOrder) {
      return;
    }

    const orderData: UpdateOrderDto = {
      clientId: formValue.clientId,
      items: formValue.items.map((item: any) => ({
        articleId: item.articleId,
        quantity: item.quantity,
      })),
    };

    this.isSaving = true;
    this.orderService.updateOrder(this.orderId, orderData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess('Commande modifiée avec succès');
        this.router.navigate(['/orders']);
      },
      error: (err: any) => {
        this.showError(err.message || 'Erreur lors de la modification de la commande');
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  onCancel(): void {
    if (this.orderForm.dirty) {
      this.confirmAction('Annuler les modifications', 'Les modifications non sauvegardées seront perdues. Continuer ?', () => this.router.navigate(['/orders']));
    } else {
      this.router.navigate(['/orders']);
    }
  }

  private confirmAction(title: string, message: string, callback: () => void): void {
    const dialogRef = this.dialog.open(OrderConfirmationModalComponent, { width: '400px', data: { title, message } });
    dialogRef.afterClosed().subscribe(result => { if (result) callback(); });
  }

  private showSuccess(message: string): void { this.snackBar.open(message, 'Fermer', { duration: 3000, panelClass: ['success-snackbar'] }); }
  private showError(message: string): void { this.snackBar.open(message, 'Fermer', { duration: 5000, panelClass: ['error-snackbar'] }); }
  trackByIndex(index: number): number { return index; }
  getClientName(order: Order): string { return `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim() || 'Client inconnu'; }
}

