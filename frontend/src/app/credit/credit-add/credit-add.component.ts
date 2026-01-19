import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CreditService } from '../service/credit.service';
import { ItemService } from 'src/app/article/service/item.service';
import { ClientService } from 'src/app/client/service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription, Observable, of, forkJoin } from 'rxjs';
import { map, finalize, switchMap, tap, catchError } from 'rxjs/operators';
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

    // Initialisation de base
    if (this.isPromoter) {
      this.creditForm.patchValue({ commercial: this.currentUser.username });
      this.creditForm.get('commercial')?.disable();
    }

    // Écouteur pour le changement de type de vente
    this.creditForm.get('saleType')?.valueChanges.subscribe(type => {
      this.saleType = type;
      // On ne déclenche le changement manuel que si ce n'est pas lors du chargement initial
      if (!this.isLoading) {
        this.onSaleTypeChange(type);
      }
    });

    // Chaîne de chargement principale
    const initSequence$ = this.clientService.getAgents().pipe(
      tap(commercials => {
        this.commercials = commercials;
      }),
      switchMap(() => {
        if (this.creditId) {
          return this.loadCreditData(this.creditId);
        } else {
          // Mode création : initialisation par défaut
          return this.initializeCreationMode();
        }
      }),
      finalize(() => {
        this.spinner.hide();
        this.isLoading = false;
      })
    );

    this.subscriptions.push(initSequence$.subscribe({
      error: (err) => {
        console.error('Erreur d\'initialisation:', err);
        this.alertService.showError('Erreur lors du chargement de la page');
      }
    }));
    console.log('CreditID: ', this.creditId);
  }

  // Charge les données du crédit et initialise les dépendances
  private loadCreditData(id: number): Observable<any> {
    console.log(`[loadCreditData] Début chargement crédit ID: ${id}`);
    return this.creditService.getCreditById(id).pipe(
      switchMap(response => {
        console.log('[loadCreditData] Réponse API reçue:', response);
        const data = response.data;
        if (!data) {
            console.warn('[loadCreditData] Aucune donnée trouvée pour ce crédit');
            return of(null);
        }

        // 1. Déterminer le type et configurer le formulaire
        const type = data.type === 'CASH' ? 'CASH' : 'CREDIT';
        console.log(`[loadCreditData] Type de vente détecté: ${type}`);
        this.saleType = type;
        this.creditForm.patchValue({ saleType: type }, { emitEvent: false });

        // 2. Préparer les observables de dépendances (clients, stocks)
        let dependencies$: Observable<any>;

        if (type === 'CREDIT') {
          const commercialUsername = typeof data.collector === 'object' ? data.collector.username : data.collector;
          console.log(`[loadCreditData] Commercial détecté: ${commercialUsername}`);

          this.creditForm.patchValue({ commercial: commercialUsername });
          this.creditForm.get('commercial')?.setValidators(Validators.required);

          if (this.isPromoter) {
             this.creditForm.get('commercial')?.disable();
          } else {
             this.creditForm.get('commercial')?.enable();
          }

          dependencies$ = forkJoin({
            stock: this.getCommercialStockObservable(commercialUsername),
            clients: this.getClientsForCommercialObservable(commercialUsername)
          });
        } else {
          this.creditForm.get('commercial')?.clearValidators();
          this.creditForm.get('commercial')?.disable(); // Optionnel, selon UX désiré

          dependencies$ = forkJoin({
            stock: this.getGeneralStockObservable(),
            clients: this.getAllClientsObservable()
          });
        }

        this.creditForm.get('commercial')?.updateValueAndValidity();

        // 3. Exécuter le chargement des dépendances puis remplir le formulaire
        return dependencies$.pipe(
          tap((results) => {
            console.log('[loadCreditData] Dépendances chargées:', results);
            // Une fois les listes chargées, on remplit les valeurs
            this.creditForm.patchValue({
              clientId: data.client?.id,
              advance: data.advance || 0,
              beginDate: data.beginDate ? data.beginDate.split('T')[0] : null,
              expectedEndDate: data.expectedEndDate ? data.expectedEndDate.split('T')[0] : null,
              totalAmount: data.totalAmount
            });

            if (data.articles && Array.isArray(data.articles)) {
              console.log('[loadCreditData] Articles bruts:', data.articles);
              const articlesData = data.articles.map((article: any) => ({
                articleId: article.articles?.id || article.articleId,
                quantity: article.quantity || 0
              }));
              console.log('[loadCreditData] Articles formatés pour le formulaire:', articlesData);
              this.creditForm.patchValue({ articles: articlesData });
            } else {
                console.warn('[loadCreditData] Aucun article trouvé ou format incorrect');
            }
          })
        );
      })
    );
  }

  private initializeCreationMode(): Observable<any> {
    // Initialisation par défaut pour une nouvelle vente
    if (this.isPromoter) {
      return forkJoin({
        stock: this.getCommercialStockObservable(this.currentUser.username),
        clients: this.getClientsForCommercialObservable(this.currentUser.username)
      });
    } else {
      // Par défaut CREDIT, mais pas de commercial sélectionné
      this.onSaleTypeChange('CREDIT');
      return of(null);
    }
  }

  // --- Méthodes Observables pour forkJoin ---

  private getCommercialStockObservable(username: string): Observable<any[]> {
    if (!username) return of([]);
    return this.commercialStockService.getAvailableItems(username).pipe(
      tap(items => {
        console.log(`[getCommercialStockObservable] Stock chargé pour ${username}:`, items?.length);
        this.articles = items.map(item => ({
          id: item.articleId,
          commercialName: item.commercialName,
          sellingPrice: item.sellingPrice,
          creditSalePrice: item.creditSalePrice,
          stockQuantity: item.quantityRemaining,
          marque: '',
          model: ''
        }));
      }),
      catchError((err) => {
        console.error('[getCommercialStockObservable] Erreur:', err);
        this.toastr.error('Erreur chargement stock commercial');
        return of([]);
      })
    );
  }

  private getGeneralStockObservable(): Observable<any[]> {
    return this.itemService.getAllArticles().pipe(
      map(response => response.data.content),
      tap(articles => {
          console.log('[getGeneralStockObservable] Stock général chargé:', articles?.length);
          this.articles = articles;
      }),
      catchError((err) => {
        console.error('[getGeneralStockObservable] Erreur:', err);
        this.toastr.error('Erreur chargement stock général');
        return of([]);
      })
    );
  }

  private getClientsForCommercialObservable(username: string): Observable<any[]> {
    if (!username) return of([]);
    return this.clientService.getClientByCommercial(username, 0, 10000, 'id,desc').pipe(
      map(response => response.data.content),
      tap(clients => {
        console.log(`[getClientsForCommercialObservable] Clients chargés pour ${username}:`, clients?.length);
        this.clients = clients.filter((client: any) => client.clientType === 'CLIENT');
      }),
      catchError((err) => {
        console.error('[getClientsForCommercialObservable] Erreur:', err);
        this.toastr.error('Erreur chargement clients');
        return of([]);
      })
    );
  }

  private getAllClientsObservable(): Observable<any[]> {
    return this.clientService.getClients(0, 10000, 'id,desc', this.currentUser).pipe(
      map(response => response.data.content),
      tap(clients => {
        console.log('[getAllClientsObservable] Tous les clients chargés:', clients?.length);
        this.clients = clients.filter((client: any) => client.clientType === 'CLIENT');
      }),
      catchError((err) => {
        console.error('[getAllClientsObservable] Erreur:', err);
        this.toastr.error('Erreur chargement clients');
        return of([]);
      })
    );
  }

  // --- Gestionnaires d'événements ---

  onSaleTypeChange(type: 'CREDIT' | 'CASH') {
    this.articles = [];
    this.clients = [];
    this.creditForm.get('clientId')?.reset();
    this.creditForm.get('articles')?.reset([]);

    if (type === 'CASH') {
      this.creditForm.get('commercial')?.clearValidators();
      this.creditForm.get('commercial')?.updateValueAndValidity();
      this.creditForm.get('commercial')?.disable();

      this.spinner.show();
      forkJoin({
        stock: this.getGeneralStockObservable(),
        clients: this.getAllClientsObservable()
      }).pipe(finalize(() => this.spinner.hide())).subscribe();

    } else { // CREDIT
      this.creditForm.get('commercial')?.setValidators(Validators.required);
      this.creditForm.get('commercial')?.updateValueAndValidity();

      if (this.isPromoter) {
         this.creditForm.get('commercial')?.disable();
      } else {
         this.creditForm.get('commercial')?.enable();
      }

      const commercial = this.creditForm.get('commercial')?.value;
      if (commercial) {
        this.spinner.show();
        forkJoin({
          stock: this.getCommercialStockObservable(commercial),
          clients: this.getClientsForCommercialObservable(commercial)
        }).pipe(finalize(() => this.spinner.hide())).subscribe();
      }
    }
  }

  onCommercialChange() {
    const commercial = this.creditForm.get('commercial')?.value;
    this.creditForm.get('clientId')?.reset();
    this.creditForm.get('articles')?.reset([]);

    if (commercial) {
      this.spinner.show();
      forkJoin({
        stock: this.getCommercialStockObservable(commercial),
        clients: this.getClientsForCommercialObservable(commercial)
      }).pipe(finalize(() => this.spinner.hide())).subscribe();
    } else {
      this.articles = [];
      this.clients = [];
    }
  }

  // --- Méthodes utilitaires ---

  loadCommercialStock(username: string) {
    this.spinner.show();
    this.getCommercialStockObservable(username)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe();
  }

  loadGeneralStock() {
    this.spinner.show();
    this.getGeneralStockObservable()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe();
  }

  loadClientsForCommercial(username: string) {
    this.spinner.show();
    this.getClientsForCommercialObservable(username)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe();
  }

  loadAllClients() {
    this.spinner.show();
    this.getAllClientsObservable()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  onSubmit(): void {
    if (this.creditForm.invalid) {
      this.markFormGroupTouched(this.creditForm);
      this.alertService.showWarning('Veuillez remplir tous les champs requis', 'Formulaire invalide');
      return;
    }

    this.spinner.show();
    this.isLoading = true;
    const formValue = this.creditForm.getRawValue();

    let submitObservable: Observable<any>;

    if (formValue.saleType === 'CREDIT') {
        const payload = {
          clientId: formValue.clientId,
          articles: { articleEntries: formValue.articles.map((article: any) => ({
            articleId: article.articleId,
            quantity: article.quantity,
            unitPrice: article.creditSalePrice
          }))},
          advance: formValue.advance,
          beginDate: formValue.beginDate,
          expectedEndDate: formValue.expectedEndDate,
          totalAmount: formValue.totalAmount,
          commercial: formValue.commercial
        };
        submitObservable = this.creditService.distributeArticles(payload);
    } else {
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
            type: 'CASH'
        };

        submitObservable = this.creditId
          ? this.creditService.updateCredit(this.creditId, payload)
          : this.creditService.addCredit(payload);
    }

    this.subscriptions.push(
      submitObservable.pipe(finalize(() => {
        this.spinner.hide();
        this.isLoading = false;
      })).subscribe({
        next: (response) => {
          const body = response.body || response;
          if (body.statusCode === 200 || body.statusCode === 201) {
            const msg = this.creditId ? 'Vente mise à jour avec succès' : 'Vente ajoutée avec succès';
            this.alertService.showSuccess(msg);
            this.router.navigate(['/credit-list']);
          } else {
            this.alertService.showError(body.message || 'Une erreur est survenue');
          }
        },
        error: (err) => {
          this.alertService.showError('Erreur lors de la soumission : ' + (err.error?.message || err.message));
          console.error(err);
        }
      })
    );
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
