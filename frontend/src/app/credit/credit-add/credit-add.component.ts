import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CreditService } from '../service/credit.service';
import { ItemService } from 'src/app/article/service/item.service';
import { ClientService } from 'src/app/client/service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { forkJoin, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from "../../auth/service/auth.service";
import { UserService } from '../../user/service/user.service';
import { UserProfile } from '../../shared/models/user-profile.enum';
import { CommercialStockService } from 'src/app/stock/services/commercial-stock.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-credit-add',
  templateUrl: './credit-add.component.html',
  styleUrls: ['./credit-add.component.scss']
})
export class CreditAddComponent implements OnInit, OnDestroy {
  creditForm!: FormGroup;
  clients: any[] = [];
  articles: any[] = [];
  commercials: any[] = [];
  isLoading = false;
  creditId?: number;
  isPromoter = false;
  currentUser: any;
  saleType: 'CREDIT' | 'CASH' = 'CREDIT';

  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private creditService: CreditService,
    private clientService: ClientService,
    private itemService: ItemService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService,
    private userService: UserService,
    private commercialStockService: CommercialStockService,
    private toastr: ToastrService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.creditForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      commercial: [null], // Pour le mode Crédit
      articles: [[], Validators.required],
      advance: [0, [Validators.required, Validators.min(0)]],
      beginDate: [new Date().toISOString().split('T')[0]],
      expectedEndDate: [null],
      totalAmount: [0],
      saleType: ['CREDIT']
    });
  }

  ngOnInit(): void {
    this.spinner.show();
    this.creditId = this.route.snapshot.params['id'] ? +this.route.snapshot.params['id'] : undefined;
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);

    const loadSub = forkJoin({
      clients: this.clientService.getClients(0, 10000, 'id,desc', this.currentUser.username)
        .pipe(map(response => response.data.content)),
      commercials: this.clientService.getAgents()
    }).subscribe({
      next: ({ clients, commercials }) => {
        // Filtrer les clients pour ne garder que ceux de type 'CLIENT'
        this.clients = clients.filter((client: any) => client.clientType === 'CLIENT');
        this.commercials = commercials;

        this.setupInitialState();

        if (this.creditId) {
          this.loadCredit(this.creditId);
        }
        this.spinner.hide();
      },
      error: (error) => {
        this.alertService.showError('Erreur de chargement des données');
        this.spinner.hide();
      }
    });

    this.subscriptions.push(loadSub);
  }

  setupInitialState() {
    if (this.isPromoter) {
      this.creditForm.patchValue({ commercial: this.currentUser.username });
      this.creditForm.get('commercial')?.disable();
      this.loadCommercialStock(this.currentUser.username);
    }

    // Ecouter les changements de type de vente
    this.creditForm.get('saleType')?.valueChanges.subscribe(type => {
      this.saleType = type;
      this.onSaleTypeChange(type);
    });

    // Initialiser l'état par défaut (CREDIT)
    this.onSaleTypeChange('CREDIT');
  }

  onSaleTypeChange(type: 'CREDIT' | 'CASH') {
    if (type === 'CASH') {
      this.creditForm.get('commercial')?.clearValidators();
      this.creditForm.get('commercial')?.updateValueAndValidity();
      this.loadGeneralStock();
    } else {
      this.creditForm.get('commercial')?.setValidators(Validators.required);
      this.creditForm.get('commercial')?.updateValueAndValidity();

      // Si on est promoter, on garde notre username, sinon on attend la sélection
      if (this.isPromoter) {
          this.loadCommercialStock(this.currentUser.username);
      } else {
          const commercial = this.creditForm.get('commercial')?.value;
          if (commercial) {
            this.loadCommercialStock(commercial);
          } else {
            this.articles = []; // Reset articles if no commercial selected
          }
      }
    }
  }

  onCommercialChange() {
    const commercial = this.creditForm.get('commercial')?.value;
    if (commercial) {
      this.loadCommercialStock(commercial);
    }
  }

  loadCommercialStock(username: string) {
    this.spinner.show();
    this.commercialStockService.getAvailableItems(username).subscribe({
      next: (items) => {
        this.articles = items.map(item => ({
          id: item.articleId,
          commercialName: item.commercialName,
          sellingPrice: item.sellingPrice,
          creditSalePrice: item.creditSalePrice,
          stockQuantity: item.quantityRemaining,
          marque: '',
          model: ''
        }));
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Erreur chargement stock commercial');
        this.spinner.hide();
      }
    });
  }

  loadGeneralStock() {
    this.spinner.show();
    this.itemService.getAllArticles().pipe(
      map(response => response.data.content)
    ).subscribe({
      next: (articles) => {
        this.articles = articles;
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Erreur chargement stock général');
        this.spinner.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  loadCredit(creditId: number): void {
    const loadCreditSub = this.creditService.getCreditById(creditId).subscribe({
      next: (response: any) => {
        const data = response.data;
        if (data) {
          this.creditForm.patchValue({
            clientId: data.client.id,
            advance: data.advance || 0,
            // TODO: Gérer le type de vente et le commercial si stocké dans le backend
          });

          // Prepare articles for the article selector component
          const articlesData = (data.articles || []).map((article: any) => ({
            articleId: article.articles.id,
            quantity: article.quantity || 0
          }));

          this.creditForm.patchValue({
            articles: articlesData
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du crédit:', error);
        this.alertService.showError('Erreur lors du chargement du crédit');
      }
    });

    this.subscriptions.push(loadCreditSub);
  }

  onSubmit(): void {
    if (this.creditForm.invalid) {
      this.markFormGroupTouched(this.creditForm);
      this.alertService.showWarning('Veuillez remplir tous les champs requis', 'Formulaire invalide');
      return;
    }

    this.spinner.show();
    this.isLoading = true;
    const formValue = this.creditForm.getRawValue(); // getRawValue pour inclure les champs disabled

    if (formValue.saleType === 'CREDIT') {
        const payload = {
          clientId: formValue.clientId,
          articles: formValue.articles.map((article: any) => ({
            articleId: article.articleId,
            quantity: article.quantity
          })),
          advance: formValue.advance,
          beginDate: formValue.beginDate,
          expectedEndDate: formValue.expectedEndDate,
          totalAmount: formValue.totalAmount,
          commercial: formValue.commercial
        };

        // Utilisation de distributeArticles pour les ventes à crédit
        const submitSub = this.creditService.distributeArticles(payload).subscribe({
          next: (response) => {
            this.spinner.hide();
            const body = response.body || response;

            if (body.statusCode === 200 || body.statusCode === 201) {
              this.alertService.showSuccess('Vente à crédit effectuée avec succès');
              this.router.navigate(['/credit-list']);
            } else {
              this.alertService.showError(body.message || 'Une erreur est survenue');
            }
            this.isLoading = false;
          },
          error: (err: any) => {
            this.spinner.hide();
            this.alertService.showError('Erreur lors de la soumission : ' + err.message);
            this.isLoading = false;
            console.error(err);
          }
        });
        this.subscriptions.push(submitSub);

    } else {
        // Logique pour la vente au comptant (CASH)
        const payload = {
            clientId: formValue.clientId,
            articles: formValue.articles.map((article: any) => ({
              articleId: article.articleId,
              quantity: article.quantity
            })),
            advance: formValue.advance,
            beginDate: formValue.beginDate,
            expectedEndDate: formValue.expectedEndDate,
            totalAmount: formValue.totalAmount,
            type: 'CASH' // Ajout de la propriété type: 'CASH'
        };

        const apiCall = this.creditId
          ? this.creditService.updateCredit(this.creditId, payload)
          : this.creditService.addCredit(payload);

        const submitSub = apiCall.subscribe({
          next: (response) => {
            this.spinner.hide();
            const body = response.body || response;

            if (body.statusCode === 200 || body.statusCode === 201) {
              const successMessage = this.creditId
                ? 'Vente mise à jour avec succès'
                : 'Vente ajoutée avec succès';
              this.alertService.showSuccess(successMessage);
              this.router.navigate(['/credit-list']);
            } else {
              this.alertService.showError(body.message || 'Une erreur est survenue');
            }
            this.isLoading = false;
          },
          error: (err: any) => {
            this.spinner.hide();
            this.alertService.showError('Erreur lors de la soumission : ' + err.message);
            this.isLoading = false;
            console.error(err);
          }
        });
        this.subscriptions.push(submitSub);
    }
  }

  onTotalAmountChange(totalAmount: number): void {
    this.creditForm.patchValue({
      totalAmount: totalAmount
    }, { emitEvent: false });
  }

  searchClient = (term: string, item: any) => {
    term = term.toLowerCase();
    const fullName = `${item.firstname} ${item.lastname}`.toLowerCase();
    return fullName.includes(term);
  }

  searchCommercial = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onCancel(): void {
    this.router.navigate(['/credit-list']);
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
