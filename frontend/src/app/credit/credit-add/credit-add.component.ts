import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CreditService } from '../service/credit.service';
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
import { saveAs } from 'file-saver';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { ArticleSelectorComponent } from '../components/article-selector/article-selector.component';
import { ClientSelectComponent } from 'src/app/shared/components/client-select/client-select.component';

@Component({
  selector: 'app-credit-add',
  templateUrl: './credit-add.component.html',
  styleUrls: ['./credit-add.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreditAddComponent implements OnInit, OnDestroy {
  @ViewChild(ArticleSelectorComponent) articleSelector?: ArticleSelectorComponent;
  @ViewChild(ClientSelectComponent) clientSelect?: ClientSelectComponent;

  creditForm!: FormGroup;
  clients: any[] = [];
  articles: any[] = [];
  commercials: any[] = [];
  isLoading = false;
  creditId?: number;
  isPromoter = false;
  currentUser: any;
  saleType: 'CREDIT' | 'CASH' = 'CREDIT';
  showReceiptModal = false;
  receiptData: any = {};
  dualCreditEnabled = false;
  creditPurpose: 'PERSONAL' | 'BUSINESS' = 'PERSONAL';

  private subscriptions: Subscription[] = [];

  get useLazyArticleLoading(): boolean {
    return this.saleType === 'CASH';
  }

  get clientSelectCommercial(): string | null {
    if (this.saleType === 'CREDIT') {
      return this.creditForm.getRawValue().commercial || null;
    }
    if (this.isPromoter) {
      return this.currentUser?.username || null;
    }
    return null;
  }

  get clientSelectUsername(): string | null {
    if (this.saleType === 'CREDIT') {
      return null;
    }
    if (this.clientSelectCommercial) {
      return null;
    }
    return this.currentUser?.username || null;
  }

  get isClientSelectDisabled(): boolean {
    return this.saleType === 'CREDIT' && !this.creditForm.get('commercial')?.value;
  }

  constructor(
    private formBuilder: FormBuilder,
    private creditService: CreditService,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService,
    private userService: UserService,
    private commercialStockService: CommercialStockService,
    private toastr: ToastrService,
    private featureFlagService: FeatureFlagService
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
      saleType: ['CREDIT'],
      creditPurpose: ['PERSONAL']
    });
  }

  get selectedClient(): any | undefined {
    const clientId = this.creditForm.get('clientId')?.value;
    return clientId != null ? this.resolveClient(clientId) : undefined;
  }

  get showCreditPurposeSelector(): boolean {
    return this.dualCreditEnabled
      && this.saleType === 'CREDIT'
      && !!this.selectedClient?.businessCreditAuthorized;
  }

  ngOnInit(): void {
    this.dualCreditEnabled = this.featureFlagService.isFeatureEnabled(FeatureFlags.DualCreditAuthorization);
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

    this.creditForm.get('clientId')?.valueChanges.subscribe(() => {
      if (!this.showCreditPurposeSelector) {
        this.creditForm.patchValue({ creditPurpose: 'PERSONAL' }, { emitEvent: false });
        this.creditPurpose = 'PERSONAL';
      }
    });

    this.creditForm.get('creditPurpose')?.valueChanges.subscribe((purpose: 'PERSONAL' | 'BUSINESS') => {
      this.creditPurpose = purpose || 'PERSONAL';
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
  }

  // Charge les données du crédit et initialise les dépendances
  private loadCreditData(id: number): Observable<any> {
    return this.creditService.getCreditById(id).pipe(
      switchMap(response => {
        const data = response.data;
        if (!data) {
          return of(null);
        }

        // 1. Déterminer le type et configurer le formulaire
        const type = data.type === 'CASH' ? 'CASH' : 'CREDIT';
        this.saleType = type;
        this.creditForm.patchValue({ saleType: type }, { emitEvent: false });

        // 2. Préparer les observables de dépendances (clients, stocks)
        let dependencies$: Observable<any>;

        if (type === 'CREDIT') {
          const commercialUsername = typeof data.collector === 'object' ? data.collector.username : data.collector;

          this.creditForm.patchValue({ commercial: commercialUsername });
          this.creditForm.get('commercial')?.setValidators(Validators.required);

          if (this.isPromoter) {
            this.creditForm.get('commercial')?.disable();
          } else {
            this.creditForm.get('commercial')?.enable();
          }

          dependencies$ = forkJoin({
            stock: this.getCommercialStockObservable(commercialUsername)
          });
        } else {
          this.creditForm.get('commercial')?.clearValidators();
          this.creditForm.get('commercial')?.disable();

          dependencies$ = of(null);
        }

        this.creditForm.get('commercial')?.updateValueAndValidity();

        // 3. Exécuter le chargement des dépendances puis remplir le formulaire
        return dependencies$.pipe(
          tap((results) => {
            // Une fois les listes chargées, on remplit les valeurs
            this.creditForm.patchValue({
              clientId: data.client?.id,
              advance: data.advance || 0,
              beginDate: data.beginDate ? data.beginDate.split('T')[0] : null,
              expectedEndDate: data.expectedEndDate ? data.expectedEndDate.split('T')[0] : null,
              totalAmount: data.totalAmount
            });

            if (data.articles && Array.isArray(data.articles)) {
              const articlesData = data.articles.map((article: any) => ({
                articleId: article.articles?.id || article.articleId,
                quantity: article.quantity || 0
              }));
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
        stock: this.getCommercialStockObservable(this.currentUser.username)
      });
    } else {
      // Par défaut CREDIT, mais pas de commercial sélectionné
      this.onSaleTypeChange('CREDIT');
      return of(null);
    }
  }

  // --- Méthodes Observables pour forkJoin ---

  private resolveArticle(articleId: number): any | undefined {
    if (this.useLazyArticleLoading) {
      return this.articleSelector?.getArticle(articleId);
    }
    return this.articles.find(article => article.id === articleId);
  }

  private resolveReceiptArticleLine(
    item: { articleId: number; quantity: number },
    savedCredit: any,
    saleType: 'CREDIT' | 'CASH'
  ): { name: string; quantity: number; unitPrice: number; totalPrice: number } {
    const savedLine = (savedCredit?.articles || []).find(
      (line: any) => (line.articles?.id ?? line.articleId) === item.articleId
    );
    const art = savedLine?.articles ?? this.resolveArticle(item.articleId);
    const unitPrice = saleType === 'CREDIT'
      ? (savedLine?.unitPrice ?? savedLine?.articles?.creditSalePrice ?? art?.creditSalePrice ?? 0)
      : (savedLine?.unitPrice ?? savedLine?.articles?.sellingPrice ?? art?.sellingPrice ?? 0);

    return {
      name: art?.commercialName || art?.name || 'Article inconnu',
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity
    };
  }

  private resolveClient(clientId: number): any | undefined {
    return this.clientSelect?.getClient(clientId) ?? this.clients.find(client => client.id === clientId);
  }

  private getCommercialStockObservable(username: string): Observable<any[]> {
    if (!username) return of([]);
    return this.commercialStockService.getAvailableItems(username).pipe(
      tap(items => {
        this.articles = items.map(item => ({
          id: item.articleId,
          commercialName: item.commercialName,
          name: item.commercialName || item.name || '',
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
    } else {
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
        this.getCommercialStockObservable(commercial)
          .pipe(finalize(() => this.spinner.hide()))
          .subscribe();
      }
    }
  }

  onCommercialChange() {
    const commercial = this.creditForm.get('commercial')?.value;
    this.creditForm.get('clientId')?.reset();
    this.creditForm.get('articles')?.reset([]);

    if (commercial) {
      this.spinner.show();
      this.getCommercialStockObservable(commercial)
        .pipe(finalize(() => this.spinner.hide()))
        .subscribe();
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
    // Les articles comptant sont chargés à la demande par le sélecteur (lazy load).
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

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
      const payload: any = {
        clientId: formValue.clientId,
        articles: {
          articleEntries: formValue.articles.map((article: any) => ({
            articleId: article.articleId,
            quantity: article.quantity,
            unitPrice: article.creditSalePrice
          }))
        },
        advance: formValue.advance,
        beginDate: formValue.beginDate,
        expectedEndDate: formValue.expectedEndDate,
        totalAmount: formValue.totalAmount,
        commercial: formValue.commercial
      };
      if (this.dualCreditEnabled && this.selectedClient?.businessCreditAuthorized) {
        payload.creditPurpose = formValue.creditPurpose || 'PERSONAL';
      }
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
            const isPrintEnabled = this.featureFlagService.isFeatureEnabled(FeatureFlags.PrintReceiptAfterSale);
            const msg = this.creditId ? 'Vente mise à jour avec succès' : 'Vente ajoutée avec succès';
            if (isPrintEnabled) {
              this.alertService.toastSuccess(msg);
              const savedCredit = body.data;
              this.openReceiptModal(savedCredit);
            } else {
              this.alertService.showSuccess(msg);
              this.router.navigate(['/credit/list']);
            }
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

  searchCommercial = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onCancel(): void {
    this.router.navigate(['/credit/list']);
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

  openReceiptModal(savedCredit: any): void {
    const formValue = this.creditForm.getRawValue();
    const clientId = formValue.clientId;
    const clientObj = this.resolveClient(clientId);
    const clientName = clientObj ? `${clientObj.firstname} ${clientObj.lastname}` : 'Client inconnu';
    const clientPhone = clientObj?.phone || '';
    const clientAddress = clientObj?.address || '';
    const clientCode = clientObj?.code || '';
    const commercialName = formValue.commercial || this.currentUser?.username || '';

    const receiptArticles = (formValue.articles || []).map((item: any) =>
      this.resolveReceiptArticleLine(item, savedCredit, formValue.saleType)
    );

    const totalAmount = savedCredit?.totalAmount || formValue.totalAmount || 0;
    const advance = savedCredit?.advance !== undefined ? savedCredit.advance : (formValue.advance || 0);
    const remainingAmount = savedCredit?.totalAmountRemaining !== undefined 
      ? savedCredit.totalAmountRemaining 
      : (totalAmount - advance);
    const dailyStake = savedCredit?.dailyStake !== undefined 
      ? savedCredit.dailyStake 
      : 0;

    this.receiptData = {
      reference: savedCredit?.reference || 'CSH-TEMP',
      date: new Date(),
      clientName: clientName,
      clientPhone: clientPhone,
      clientAddress: clientAddress,
      clientCode: clientCode,
      commercialName: commercialName,
      articles: receiptArticles,
      saleType: formValue.saleType,
      totalAmount: totalAmount,
      advance: advance,
      remainingAmount: remainingAmount,
      dailyStake: dailyStake
    };

    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.router.navigate(['/credit/list']);
  }

  printReceipt(): void {
    const printContent = document.getElementById('print-receipt-content');
    if (!printContent) return;

    const uniqueName = new Date().getTime();
    const windowName = 'PrintWindow_' + uniqueName;
    const printWindow = window.open('about:blank', windowName, 'left=100,top=100,width=800,height=900,toolbar=0,scrollbars=1,status=0');
    
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer le reçu.');
      return;
    }

    const uniqueId = '#EL' + new Date().getTime().toString();
    const formattedDate = new Date().toLocaleDateString('fr-FR');
    const formattedTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu de Vente - ${this.receiptData.reference}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              color: #000;
              margin: 10px;
              padding: 0;
              background: #fff;
              font-size: 12px;
              line-height: 1.4;
            }
            .receipt-paper {
              max-width: 300px;
              margin: 0 auto;
              padding: 10px;
            }
            .header, .separator, .footer {
              text-align: center;
            }
            .header {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .separator {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .row .value {
              white-space: nowrap;
              padding-left: 5px;
              font-weight: bold;
            }
            .article-item {
              margin-bottom: 8px;
            }
            .article-name {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .article-details {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .total-row {
              font-weight: bold;
            }
            .footer {
              margin-top: 15px;
              font-size: 11px;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .receipt-paper {
                max-width: 100%;
                padding: 5px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-paper">
            <div class="header">
              AMENOUVEVE-YAVEH<br>
              RECU DE DISTRIBUTION
            </div>
            <p style="text-align:center;">----------------------------</p>
            <div class="separator"></div>

            <div class="row">
              <span>Référence:</span>
              <span class="value">${this.receiptData.reference}</span>
            </div>
            <div class="row">
              <span>Date:</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="row">
              <span>Heure:</span>
              <span class="value">${formattedTime}</span>
            </div>

            <div class="separator"></div>
            
            <div style="margin-bottom: 10px;">
              <strong>CLIENT:</strong><br>
              ${this.receiptData.clientCode ? this.receiptData.clientCode + '<br>' : ''}
              ${this.receiptData.clientName}<br>
              ${this.receiptData.clientAddress ? this.receiptData.clientAddress + '<br>' : ''}
              ${this.receiptData.clientPhone || ''}
            </div>

            <div style="margin-bottom: 10px;">
              <strong>COMMERCIAL:</strong> ${this.receiptData.commercialName}
            </div>

            <div class="separator"></div>
            
            <div style="margin-bottom: 10px;"><strong>ARTICLES:</strong></div>
            ${this.receiptData.articles.map((item: any) => `
              <div class="article-item">
                <div class="article-name">${item.name}</div>
                <div class="row article-details">
                  <span>${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')}</span>
                  <span>${item.totalPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            `).join('')}

            <div class="separator"></div>
            <p style="text-align:center;">----------------------------</p>

            <div class="row total-row">
              <span>TOTAL:</span>
              <span class="value">${this.receiptData.totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            
            ${this.receiptData.saleType === 'CREDIT' ? `
              <p style="text-align:center;">----------------------------</p>
              <div class="row total-row">
                <span>MISE JOURNALIERE:</span>
                <span class="value">${this.receiptData.dailyStake.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="row">
                <span>AVANCE:</span>
                <span class="value">${this.receiptData.advance.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="row total-row">
                <span>NOUVEAU SOLDE:</span>
                <span class="value">${this.receiptData.remainingAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ` : ''}

            <div class="separator"></div>
            <div class="footer">
              <p>Merci pour votre confiance!</p>
              ${this.receiptData.saleType === 'CREDIT' ? '<p>Payez régulièrement vos mises</p>' : ''}
              <strong>!!!AMENOUVEVE-YAHVE!!!</strong>
              <p>${uniqueId}</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  saveReceipt(): void {
    const uniqueId = '#EL' + new Date().getTime().toString();
    const formattedDate = new Date().toLocaleDateString('fr-FR');
    const formattedTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reçu de Vente - ${this.receiptData.reference}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #333;
              margin: 20px;
              padding: 0;
              background: #f4f6f9;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .receipt-paper {
              width: 100%;
              max-width: 400px;
              background: #fff;
              border: 1px solid #e1e4e8;
              padding: 25px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.08);
              border-radius: 10px;
            }
            .header, .separator, .footer {
              text-align: center;
            }
            .header {
              font-size: 18px;
              font-weight: 800;
              color: #003366;
              margin-bottom: 5px;
            }
            .separator {
              border-top: 1px dashed #ccc;
              margin: 15px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 13px;
            }
            .row .value {
              font-weight: bold;
            }
            .article-item {
              margin-bottom: 10px;
              background: #f8f9fa;
              padding: 8px;
              border-radius: 6px;
            }
            .article-name {
              font-weight: bold;
              margin-bottom: 4px;
              font-size: 13px;
            }
            .article-details {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #555;
            }
            .total-row {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #eee;
              padding-top: 6px;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="receipt-paper">
            <div class="header">
              AMENOUVEVE-YAVEH<br>
              REÇU DE VENTE
            </div>
            <div class="separator"></div>

            <div class="row">
              <span>Référence:</span>
              <span class="value">${this.receiptData.reference}</span>
            </div>
            <div class="row">
              <span>Date:</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="row">
              <span>Heure:</span>
              <span class="value">${formattedTime}</span>
            </div>

            <div class="separator"></div>
            
            <div style="margin-bottom: 12px; font-size: 13px;">
              <strong>CLIENT:</strong><br>
              ${this.receiptData.clientCode ? 'Code: ' + this.receiptData.clientCode + '<br>' : ''}
              ${this.receiptData.clientName}<br>
              ${this.receiptData.clientAddress ? this.receiptData.clientAddress + '<br>' : ''}
              ${this.receiptData.clientPhone || ''}
            </div>

            <div style="margin-bottom: 12px; font-size: 13px;">
              <strong>COMMERCIAL:</strong> ${this.receiptData.commercialName}
            </div>

            <div class="separator"></div>
            
            <div style="margin-bottom: 10px; font-size: 13px;"><strong>ARTICLES:</strong></div>
            ${this.receiptData.articles.map((item: any) => `
              <div class="article-item">
                <div class="article-name">${item.name}</div>
                <div class="row article-details">
                  <span>${item.quantity} x ${item.unitPrice.toLocaleString('fr-FR')}</span>
                  <span>${item.totalPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            `).join('')}

            <div class="separator"></div>

            <div class="row total-row">
              <span>TOTAL:</span>
              <span class="value">${this.receiptData.totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            
            ${this.receiptData.saleType === 'CREDIT' ? `
              <div class="row">
                <span>MISE JOURNALIÈRE:</span>
                <span class="value">${this.receiptData.dailyStake.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="row">
                <span>AVANCE:</span>
                <span class="value">${this.receiptData.advance.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div class="row total-row">
                <span>NOUVEAU SOLDE:</span>
                <span class="value">${this.receiptData.remainingAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ` : ''}

            <div class="separator"></div>
            <div class="footer">
              <p>Merci pour votre confiance!</p>
              ${this.receiptData.saleType === 'CREDIT' ? '<p>Payez régulièrement vos mises</p>' : ''}
              <strong>!!!AMENOUVEVE-YAHVE!!!</strong>
              <p style="font-size: 10px; color: #999; margin-top: 10px;">${uniqueId}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `recu_vente_${this.receiptData.reference}.html`);
  }
}
