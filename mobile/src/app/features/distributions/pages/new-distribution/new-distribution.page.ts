import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { takeUntil, map, startWith, distinctUntilChanged, withLatestFrom, take, switchMap } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { firstValueFrom } from 'rxjs';

import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';
import { PrintReceiptModalComponent } from '../../../../shared/components/print-receipt-modal/print-receipt-modal.component';
import { DistributionConfirmationModalComponent } from '../../../../shared/components/distribution-confirmation-modal/distribution-confirmation-modal.component';

import { Client } from '../../../../models/client.model';
import { Article } from '../../../../models/article.model';

import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import { selectAvailableArticles, selectSelectedClient, selectArticleQuantities, selectDistributionTotalAmount, selectSelectedArticlesWithDetails } from '../../../../store/distribution/distribution.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes.guard';
import { LoggerService } from '../../../../core/services/logger.service';
import { DistributionService } from '../../../../core/services/distribution.service';
import { AccountService } from '../../../../core/services/account.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { selectAvailableStockItems } from '../../../../store/commercial-stock/commercial-stock.selectors';
import { CommercialStockItem } from '../../../../models/commercial-stock-item.model';

interface DistributionViewModel {
  client: Client | null;
  articles: Article[];
  quantities: { [key: string]: number };
  totalAmount: number;
  dailyPayment: number;
  adjustedAdvance: number;
  paymentPeriod: number;
  isSpecialCase: boolean;
  canEditAdvance: boolean;
}

@Component({
  selector: 'app-new-distribution',
  templateUrl: './new-distribution.page.html',
  styleUrls: ['./new-distribution.page.scss'],
  standalone: false
})
export class NewDistributionPage implements OnInit, OnDestroy, CanComponentDeactivate {
  private destroy$ = new Subject<void>();

  distributionForm: FormGroup;
  vm$!: Observable<DistributionViewModel>;
  vm: DistributionViewModel = {
    client: null,
    articles: [],
    quantities: {},
    totalAmount: 0,
    dailyPayment: 0,
    adjustedAdvance: 0,
    paymentPeriod: 30,
    isSpecialCase: false,
    canEditAdvance: true
  };
  Object = Object; // Expose Object to the template

  private searchTerm$ = new BehaviorSubject<string>('');
  private dailyPayment$ = new BehaviorSubject<number>(0);
  private adjustedAdvance$ = new BehaviorSubject<number>(0);
  private paymentPeriod$ = new BehaviorSubject<number>(30);
  private isSpecialCase$ = new BehaviorSubject<boolean>(false);
  private canEditAdvance$ = new BehaviorSubject<boolean>(true);

  constructor(
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private store: Store,
    private actions$: Actions,
    private fb: FormBuilder,
    private alertController: AlertController,
    private log: LoggerService,
    private cdr: ChangeDetectorRef,
    private distributionService: DistributionService,
    private accountService: AccountService,
    private databaseService: DatabaseService
  ) {
    this.distributionForm = this.fb.group({ advance: [0] });
  }

  ngOnInit() {
    this.log.log('[NewDistributionPage] Initializing...');
    this.store.dispatch(DistributionActions.loadAvailableArticles());

    const availableArticles$ = this.store.select(selectAvailableArticles);
    const articleQuantities$ = this.store.select(selectArticleQuantities);
    const availableStockItems$ = this.store.select(selectAvailableStockItems);

    const filteredArticles$ = combineLatest([
      availableArticles$,
      articleQuantities$,
      this.searchTerm$.pipe(startWith(''), distinctUntilChanged()),
      availableStockItems$
    ]).pipe(
      map(([articles, quantities, searchTerm, stockItems]) => this.filterArticles(articles, quantities, searchTerm, stockItems))
    );

    this.vm$ = combineLatest({
      client: this.store.select(selectSelectedClient),
      articles: filteredArticles$,
      quantities: articleQuantities$,
      totalAmount: this.store.select(selectDistributionTotalAmount),
      dailyPayment: this.dailyPayment$.asObservable(),
      adjustedAdvance: this.adjustedAdvance$.asObservable(),
      paymentPeriod: this.paymentPeriod$.asObservable(),
      isSpecialCase: this.isSpecialCase$.asObservable(),
      canEditAdvance: this.canEditAdvance$.asObservable()
    }).pipe(
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous property for virtual scrolling
    this.vm$.subscribe(vm => {
      this.vm = vm;
      this.cdr.detectChanges();
    });

    this.setupCalculationPipeline();
    this.setupActionListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewDidLeave() {
    this.log.log('[NewDistributionPage] Leaving page, resetting state.');
    this.store.dispatch(DistributionActions.resetDistributionState());
    this.distributionForm.reset({ advance: 0 });
  }

  private setupCalculationPipeline() {
    const advanceControl = this.distributionForm.get('advance');
    if (!advanceControl) return;

    const advance$ = advanceControl.valueChanges.pipe(
      startWith(advanceControl.value || 0),
      map(value => Number(value) || 0),
      distinctUntilChanged()
    );

    combineLatest([this.store.select(selectDistributionTotalAmount), advance$])
      .pipe(
        takeUntil(this.destroy$),
        map(([totalAmount, userAdvance]) => {
          if (totalAmount <= 0) {
            return {
              dailyPayment: 0,
              adjustedAdvance: 0,
              paymentPeriod: 30,
              isSpecialCase: false,
              canEditAdvance: true
            };
          }

          // Étape 1: Calcul automatique du système (sans avance utilisateur)
          const systemCalculation = this.calculateSystemAdvance(totalAmount);

          // Étape 2: Si l'utilisateur a saisi une avance, recalculer
          if (userAdvance > 0 && userAdvance !== systemCalculation.adjustedAdvance) {
            const userCalculation = this.calculateWithUserAdvance(totalAmount, userAdvance);

            // Si le calcul avec l'avance utilisateur donne une avance négative,
            // on revient au calcul système et on bloque l'édition
            if (userCalculation.adjustedAdvance < 0) {
              return {
                ...systemCalculation,
                canEditAdvance: false
              };
            }

            return {
              ...userCalculation,
              canEditAdvance: true
            };
          }

          return {
            ...systemCalculation,
            canEditAdvance: true
          };
        })
      )
      .subscribe(({ dailyPayment, adjustedAdvance, paymentPeriod, isSpecialCase, canEditAdvance }) => {
        this.dailyPayment$.next(dailyPayment);
        this.adjustedAdvance$.next(adjustedAdvance);
        this.paymentPeriod$.next(paymentPeriod);
        this.isSpecialCase$.next(isSpecialCase);
        this.canEditAdvance$.next(canEditAdvance);

        // Mettre à jour la valeur de l'input seulement si nécessaire
        if (Math.abs(advanceControl.value - adjustedAdvance) > 0.01) {
          advanceControl.setValue(adjustedAdvance, { emitEvent: false });
        }

        // Activer/désactiver le champ selon canEditAdvance
        if (canEditAdvance) {
          advanceControl.enable({ emitEvent: false });
        } else {
          advanceControl.disable({ emitEvent: false });
        }
      });
  }

  private calculateSystemAdvance(totalAmount: number) {
    // Calcul de base: mise = totalAmount / 30, arrondie au multiple de 50 supérieur
    const baseDailyPayment = totalAmount / 30;
    let roundedDailyPayment = Math.ceil(baseDailyPayment / 50) * 50;

    // RÈGLE IMPORTANTE: La mise ne doit jamais être inférieure à 200 FCFA
    if (roundedDailyPayment < 200) {
      roundedDailyPayment = 200;
    }

    // Nombre de jours = combien de fois la mise rentre dans le total (arrondi par défaut)
    const paymentDays = Math.floor(totalAmount / roundedDailyPayment);

    // Montant couvert par les paiements journaliers
    const coveredAmount = paymentDays * roundedDailyPayment;

    // L'avance est ce qui reste
    const systemAdvance = totalAmount - coveredAmount;

    // Déterminer si c'est un crédit spécial (mise = 200 car < calculé)
    const isSpecialCase = baseDailyPayment < 200;

    return {
      dailyPayment: roundedDailyPayment,
      adjustedAdvance: systemAdvance,
      paymentPeriod: paymentDays,
      isSpecialCase
    };
  }

  private calculateWithUserAdvance(totalAmount: number, userAdvance: number) {
    // Montant restant après l'avance utilisateur
    const remainingAmount = totalAmount - userAdvance;

    if (remainingAmount <= 0) {
      return {
        dailyPayment: 0,
        adjustedAdvance: totalAmount, // Tout est payé en avance
        paymentPeriod: 0,
        isSpecialCase: true
      };
    }

    // Calcul de la mise sur le montant restant
    const baseDailyPayment = remainingAmount / 30;
    let roundedDailyPayment = Math.ceil(baseDailyPayment / 50) * 50;

    // RÈGLE IMPORTANTE: La mise ne doit jamais être inférieure à 200 FCFA
    if (roundedDailyPayment < 200) {
      roundedDailyPayment = 200;
    }

    // Nombre de jours = combien de fois la mise rentre dans le montant restant
    const paymentDays = Math.floor(remainingAmount / roundedDailyPayment);

    // Montant couvert par les paiements journaliers
    const coveredAmount = paymentDays * roundedDailyPayment;

    // Ajustement = ce qui reste après les paiements journaliers
    const adjustment = remainingAmount - coveredAmount;

    // Avance finale = avance utilisateur + ajustement
    const finalAdvance = userAdvance + adjustment;

    // Déterminer si c'est un crédit spécial (mise forcée à 200)
    const isSpecialCase = baseDailyPayment < 200;

    return {
      dailyPayment: roundedDailyPayment,
      adjustedAdvance: finalAdvance,
      paymentPeriod: paymentDays,
      isSpecialCase
    };
  }

  private setupActionListeners() {
    this.actions$.pipe(
      ofType(DistributionActions.createDistributionSuccess),
      withLatestFrom(
        this.store.select(selectAuthUser),
        this.store.select(selectSelectedArticlesWithDetails),
        this.store.select(selectSelectedClient)
      ),
      takeUntil(this.destroy$)
    ).subscribe(async ([{ distribution }, user, articles, client]) => {
      const modal = await this.modalController.create({
        component: PrintReceiptModalComponent,
        componentProps: { distribution, client, articles, commercial: user }
      });
      await modal.present();
      await modal.onDidDismiss();
      this.store.dispatch(DistributionActions.resetDistributionState());
      this.router.navigate(['/tabs/distributions']);
    });
  }

  async openClientSelector() {
    const modal = await this.modalController.create({ component: ClientSelectorModalComponent, cssClass: 'client-selector-modal' });
    modal.onDidDismiss().then(result => {
      if (result.data?.client) {
        this.store.dispatch(DistributionActions.setSelectedClient({ client: result.data.client }));
      }
    });
    await modal.present();
  }

  onSearchInput(event: any) {
    this.searchTerm$.next(event.target.value || '');
  }

  updateQuantity(article: Article, change: number) {
    this.vm$.pipe(take(1)).subscribe((vm: DistributionViewModel) => {
        const currentQuantity = vm.quantities[article.id] || 0;
        const newQuantity = currentQuantity + change;
        if (newQuantity >= 0 && newQuantity <= article.stockQuantity) {
            this.store.dispatch(DistributionActions.updateArticleQuantity({ articleId: article.id, quantity: newQuantity }));
        }
    });
  }

  onQuantityChange(article: Article, event: any) {
    const quantity = parseInt(event.target.value, 10) || 0;
    const validQuantity = Math.min(Math.max(0, quantity), article.stockQuantity);
    this.store.dispatch(DistributionActions.updateArticleQuantity({ articleId: article.id, quantity: validQuantity }));
  }

  async confirmDistribution() {
    const vm = await firstValueFrom(this.vm$);
    if (!vm.client || !Object.values(vm.quantities).some(q => q > 0)) return;

    // Règle 1: Vérifier si un crédit est déjà en cours
    const existingDistributions = await firstValueFrom(this.distributionService.getDistributionsByClient(vm.client.id));
    const hasInProgressCredit = existingDistributions.some(d => d.status === 'INPROGRESS');

    if (hasInProgressCredit) {
      await this.presentErrorAlert('Crédit Existant', 'Ce client a déjà un crédit en cours. Veuillez le solder avant d\'en créer un nouveau.');
      return;
    }

    // Règle 2: Vérifier le solde du compte
    const allAccounts = await this.accountService.getAccounts();
    const account = allAccounts.find(acc => acc.clientId === vm.client!.id);
    const accountBalance = account?.accountBalance || 0;

    const adjustedAdvance = vm.adjustedAdvance;
    const remainingAmount = vm.totalAmount - adjustedAdvance;

    // if (remainingAmount > (accountBalance * 6)) {
    //   await this.presentErrorAlert(
    //     'Plafond de Crédit Dépassé',
    //     `Le montant de ce crédit (${remainingAmount.toLocaleString('fr-FR')} FCFA) dépasse le plafond autorisé pour ce client (6 x ${accountBalance.toLocaleString('fr-FR')} = ${(accountBalance * 6).toLocaleString('fr-FR')} FCFA). Réduisez le nombre d\'articles.`
    //   );
    //   return;
    // }

    // Récupérer le creditId
    // NOTE: Avec la nouvelle migration, creditId devient optionnel ou n'est plus lié à StockOutput de la même manière.
    // Cependant, pour la compatibilité, on peut laisser vide ou gérer différemment.
    // Le plan de migration dit: "Supprimer la dépendance creditId dans la création de distribution".
    // Donc on peut passer null ou une valeur par défaut si le backend l'accepte.

    const creditId = undefined; // Plus besoin de matcher avec StockOutput

    // Si tout est OK, on continue
    const dailyPayment = vm.dailyPayment;
    const paymentPeriod = vm.paymentPeriod;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + paymentPeriod);

    const distributionData = {
      creditId: creditId,
      type: 'CLIENT', // Indique qu'il s'agit d'une vente pour un client final
      clientId: vm.client.id,
      articles: Object.entries(vm.quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([articleId, quantity]) => ({ articleId, quantity })),
      totalAmount: vm.totalAmount,
      advance: adjustedAdvance,
      paidAmount: adjustedAdvance,
      remainingAmount: remainingAmount,
      dailyPayment: dailyPayment,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      client: vm.client
    };

    this.store.dispatch(DistributionActions.createDistribution({ distributionData }));
  }

  canDeactivate(): Observable<boolean> | boolean {
    const hasChanges$ = this.vm$.pipe(
      map(vm => vm.client !== null || Object.values(vm.quantities).some(q => q > 0))
    );
    return hasChanges$.pipe(take(1), switchMap((hasChanges: boolean) => {
      if (!hasChanges) return of(true);
      return new Observable<boolean>(observer => {
        this.alertController.create({
          header: 'Quitter la page ?',
          message: 'Vous avez des données non sauvegardées. Êtes-vous sûr de vouloir quitter ?',
          buttons: [
            { text: 'Annuler', role: 'cancel', handler: () => { observer.next(false); observer.complete(); } },
            { text: 'Quitter', handler: () => { observer.next(true); observer.complete(); } }
          ]
        }).then((alert: HTMLIonAlertElement) => alert.present());
      });
    }));
  }

  private filterArticles(articles: Article[], quantities: { [key: string]: number }, searchTerm: string, stockItems: CommercialStockItem[]): Article[] {
    console.log(`[NewDistributionPage] Filtering articles. Total articles: ${articles.length}, Stock items: ${stockItems.length}`);

    // Filter articles based on available stock in CommercialStockItems
    // Only show articles that have quantityRemaining > 0 in stockItems
    // Also update the stockQuantity property of the article object to reflect the actual available stock

    const availableArticles = articles.map(article => {
        const stockItem = stockItems.find(item => item.articleId === article.id);
        return {
            ...article,
            stockQuantity: stockItem ? stockItem.quantityRemaining : 0
        };
    }).filter(article => article.stockQuantity > 0);

    console.log(`[NewDistributionPage] Available articles after stock check: ${availableArticles.length}`);

    const selectedArticleIds = Object.keys(quantities).filter(id => quantities[id] > 0);
    const searchTermLower = searchTerm.toLowerCase();

    if (!searchTerm.trim()) {
      // Pour le virtual scrolling, on retourne tous les articles disponibles
      const unselected = availableArticles.filter(a => !selectedArticleIds.includes(a.id));
      const selected = availableArticles.filter(a => selectedArticleIds.includes(a.id));
      return [...selected, ...unselected]; // Articles sélectionnés en premier
    }

    return availableArticles.filter(article =>
      article.name.toLowerCase().includes(searchTermLower) ||
      article.commercialName?.toLowerCase().includes(searchTermLower) ||
      article.reference?.toLowerCase().includes(searchTermLower)
    );
  }

  trackByArticleId(index: number, article: Article): string {
    return article.id;
  }

  // Méthodes utilitaires pour le template
  canValidate(): boolean {
    return this.vm.client !== null && this.hasSelectedArticles();
  }

  canConfirm(): boolean {
    return this.canValidate();
  }

  hasSelectedArticles(): boolean {
    return Object.values(this.vm.quantities).some(qty => qty > 0);
  }

  getSelectedArticlesCount(): number {
    return Object.values(this.vm.quantities).filter(qty => qty > 0).length;
  }

  getTotalSelectedQuantity(): number {
    return Object.values(this.vm.quantities).reduce((sum, qty) => sum + qty, 0);
  }

  getArticleQuantity(articleId: string): number {
    return this.vm.quantities[articleId] || 0;
  }

  getArticleTotal(articleId: string): number {
    const article = this.vm.articles.find(a => a.id === articleId);
    const quantity = this.getArticleQuantity(articleId);
    return article ? article.creditSalePrice * quantity : 0;
  }

  // Méthode utilitaire pour s'assurer que l'avance est toujours positive
  getDisplayAdvance(): number {
    return Math.max(0, this.vm.adjustedAdvance);
  }

  async validateDistribution() {
    if (this.canValidate()) {
      await this.showConfirmationModal();
    }
  }

  async showConfirmationModal() {
    if (!this.canConfirm()) {
      await this.showValidationError();
      return;
    }

    const modal = await this.modalController.create({
      component: DistributionConfirmationModalComponent,
      cssClass: 'distribution-confirmation-modal',
      componentProps: {
        distributionData: this.getConfirmationData()
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirmed') {
        this.confirmDistribution();
      }
    });

    await modal.present();
  }

  getConfirmationData() {
    return {
      clientName: this.vm.client ? `${this.vm.client.firstname} ${this.vm.client.lastname}` : '',
      articlesCount: this.getSelectedArticlesCount(),
      totalAmount: this.vm.totalAmount,
      dailyPayment: this.vm.dailyPayment,
      advance: this.vm.adjustedAdvance
    };
  }

  async presentErrorAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    });
    await alert.present();
  }

  private async showValidationError() {
    let message = 'Veuillez corriger les erreurs suivantes:\n';

    if (!this.vm.client) {
      message += '• Sélectionnez un client\n';
    }

    if (!this.hasSelectedArticles()) {
      message += '• Sélectionnez au moins un article\n';
    }

    const toast = await this.toastController.create({
      message: message.trim(),
      duration: 5000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/tabs/distributions']);
  }


}
