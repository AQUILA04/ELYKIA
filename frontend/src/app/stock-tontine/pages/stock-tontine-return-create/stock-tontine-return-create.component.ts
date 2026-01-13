import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StockTontineReturnService } from '../../services/stock-tontine-return.service';
import { TontineStockService } from '../../services/tontine-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from '../../../client/service/client.service';

@Component({
  selector: 'app-stock-tontine-return-create',
  templateUrl: './stock-tontine-return-create.component.html',
  styleUrls: ['./stock-tontine-return-create.component.scss']
})
export class StockTontineReturnCreateComponent implements OnInit {

  form: FormGroup;
  availableStockItems: any[] = [];
  currentUser: any;
  commercials: any[] = [];
  selectedCommercial: string | null = null;
  isStoreKeeper: boolean = false;

  constructor(
    private fb: FormBuilder,
    private stockReturnService: StockTontineReturnService,
    private tontineStockService: TontineStockService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService
  ) {
    this.form = this.fb.group({
      items: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER) || this.userService.hasProfile(UserProfile.ADMIN);

    if (this.isStoreKeeper) {
      this.loadCommercials();
    } else {
      this.selectedCommercial = this.currentUser.username;
      this.loadAvailableStock(this.currentUser.username);
    }
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
    this.tontineStockService.getStockByCommercial(username).subscribe({
      next: (items) => {
        // Mapping pour le composant article-selector
        this.availableStockItems = items.map(item => ({
          id: item.articleId, // Utilisation de l'ID réel de l'article
          articleName: item.articleName,
          commercialName: item.commercial,
          sellingPrice: item.unitPrice, // Prix unitaire
          creditSalePrice: item.unitPrice,
          stockQuantity: item.availableQuantity,
          // Champs additionnels pour l'affichage
          marque: '',
          model: ''
        }));
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement du stock');
        this.spinner.hide();
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;
    const stockReturn = {
      collector: this.selectedCommercial || this.currentUser.username,
      items: formValue.items.map((item: any) => {
        return {
          article: { id: item.articleId }, // Envoi de l'ID de l'article
          quantity: item.quantity
        };
      })
    };

    this.spinner.show();
    this.stockReturnService.create(stockReturn).subscribe({
      next: () => {
        this.toastr.success('Retour créé avec succès');
        this.spinner.hide();
        this.router.navigate(['/stock-tontine/return']);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors de la création du retour');
        this.spinner.hide();
      }
    });
  }
}
