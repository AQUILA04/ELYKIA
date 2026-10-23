import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StockReturnService } from '../../services/stock-return.service';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from '../../../client/service/client.service';
import { ActivatedRoute, Router } from '@angular/router';
import { StockChannel } from '../../models/stock-channel';
import { StockChannelService } from '../../services/stock-channel.service';
import { StockTontineReturnService } from '../../../stock-tontine/services/stock-tontine-return.service';
import { TontineStockService } from '../../../stock-tontine/services/tontine-stock.service';

@Component({
  selector: 'app-stock-return-create',
  templateUrl: './stock-return-create.component.html',
  styleUrls: ['./stock-return-create.component.scss']
})
export class StockReturnCreateComponent implements OnInit {

  form: FormGroup;
  availableStockItems: any[] = [];
  currentUser: any;
  commercials: any[] = [];
  selectedCommercial: string | null = null;
  isStoreKeeper: boolean = false;
  channel: StockChannel = 'credit';

  constructor(
    private fb: FormBuilder,
    private stockReturnService: StockReturnService,
    private tontineReturnService: StockTontineReturnService,
    private commercialStockService: CommercialStockService,
    private tontineStockService: TontineStockService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private stockChannel: StockChannelService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService
  ) {
    this.form = this.fb.group({
      items: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const next = this.stockChannel.resolve(params.get('channel'));
      const changed = this.channel !== next;
      this.channel = next;
      if (params.get('channel') !== next) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { channel: next },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
      this.stockChannel.remember(next);
      if (changed && this.selectedCommercial) {
        this.form.patchValue({ items: [] });
        this.loadAvailableStock(this.selectedCommercial);
      }
    });

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
    if (this.channel === 'tontine') {
      this.loadTontineStock(username);
      return;
    }
    this.spinner.show();
    this.commercialStockService.getAvailableItems(username).subscribe({
      next: (items) => {
        // Mapping pour le composant article-selector
        this.availableStockItems = items.map(item => ({
          id: item.articleId, // Utilisation de l'ID réel
          articleName: item.articleName, // Sauvegarde du nom pour référence
          commercialName: item.commercialName,
          sellingPrice: item.sellingPrice,
          creditSalePrice: item.creditSalePrice,
          stockQuantity: item.quantityRemaining,
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

  private loadTontineStock(username: string): void {
    this.spinner.show();
    this.tontineStockService.getStockByCommercial(username).subscribe({
      next: (response: any) => {
        const items = Array.isArray(response) ? response : (response?.data?.content) || [];
        this.availableStockItems = items.map((item: any) => ({
          id: item.articleId,
          articleName: item.articleName,
          commercialName: item.commercial,
          sellingPrice: item.unitPrice,
          creditSalePrice: item.unitPrice,
          stockQuantity: item.availableQuantity,
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
        // Retrouver l'article original pour avoir les détails corrects
        const originalItem = this.availableStockItems.find(i => i.id === item.articleId);
        return {
          article: { id: item.articleId }, // Envoi de l'ID de l'article
          quantity: item.quantity
        };
      })
    };

    this.spinner.show();
    const create$ = this.channel === 'tontine'
      ? this.tontineReturnService.create(stockReturn)
      : this.stockReturnService.create(stockReturn);
    create$.subscribe({
      next: () => {
        this.toastr.success('Retour créé avec succès');
        this.spinner.hide();
        this.router.navigate(['/stock/return'], { queryParams: { channel: this.channel } });
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors de la création du retour');
        this.spinner.hide();
      }
    });
  }
}
