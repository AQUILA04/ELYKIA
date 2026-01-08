import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StockReturnService } from '../../services/stock-return.service';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommercialMonthlyStockItem } from '../../models/commercial-stock.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from '../../../client/service/client.service';

@Component({
  selector: 'app-stock-return-create',
  templateUrl: './stock-return-create.component.html',
  styleUrls: ['./stock-return-create.component.scss']
})
export class StockReturnCreateComponent implements OnInit {

  form: FormGroup;
  availableStockItems: CommercialMonthlyStockItem[] = [];
  currentUser: any;
  commercials: any[] = [];
  selectedCommercial: string | null = null;
  isStoreKeeper: boolean = false;

  constructor(
    private fb: FormBuilder,
    private stockReturnService: StockReturnService,
    private commercialStockService: CommercialStockService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService
  ) {
    this.form = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isStoreKeeper = this.authService.hasRole('ROLE_STOREKEEPER') || this.authService.hasRole('ROLE_ADMIN');

    if (this.isStoreKeeper) {
      this.loadCommercials();
    } else {
      this.selectedCommercial = this.currentUser.username;
      this.loadAvailableStock(this.currentUser.username);
    }

    this.addItem();
  }

  loadCommercials(): void {
    this.spinner.show();
    this.clientService.getAgents().subscribe({
      next: (data) => {
        this.commercials = data;
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commerciaux', error);
        this.toastr.error('Erreur lors du chargement des commerciaux');
        this.spinner.hide();
      }
    });
  }

  searchCommercial = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onCommercialSelected(): void {
    if (this.selectedCommercial) {
      this.loadAvailableStock(this.selectedCommercial);
    } else {
      this.availableStockItems = [];
    }
  }

  loadAvailableStock(username: string): void {
    this.spinner.show();
    this.commercialStockService.getCurrentStock(username).subscribe({
      next: (stock) => {
        if (stock && stock.items) {
          this.availableStockItems = stock.items.filter(item => item.quantityRemaining > 0);
        }
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement du stock');
        this.spinner.hide();
      }
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem() {
    const itemGroup = this.fb.group({
      stockItem: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    // Validation dynamique pour ne pas dépasser le stock restant
    itemGroup.get('quantity')?.valueChanges.subscribe(val => {
      const stockItem = itemGroup.get('stockItem')?.value as unknown as CommercialMonthlyStockItem;
      if (stockItem && stockItem.quantityRemaining !== undefined && val != null && val > stockItem.quantityRemaining) {
        itemGroup.get('quantity')?.setErrors({ max: true });
      }
    });

    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;
    const stockReturn = {
      collector: this.selectedCommercial || this.currentUser.username,
      items: formValue.items.map((item: any) => ({
        article: item.stockItem.article,
        quantity: item.quantity
      }))
    };

    this.spinner.show();
    this.stockReturnService.create(stockReturn).subscribe({
      next: () => {
        this.toastr.success('Retour créé avec succès');
        this.spinner.hide();
        this.router.navigate(['/stock/return']);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors de la création du retour');
        this.spinner.hide();
      }
    });
  }
}
