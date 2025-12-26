import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject, combineLatest, firstValueFrom, of } from 'rxjs';
import { takeUntil, map, startWith, distinctUntilChanged, withLatestFrom, switchMap, take } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';

import { DistributionService } from '../../../../core/services/distribution.service';
import { Client } from '../../../../models/client.model';
import { Article } from '../../../../models/article.model';
import { Distribution } from '../../../../models/distribution.model';

import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';

import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import { selectAvailableArticles, selectSelectedClient, selectArticleQuantities, selectDistributionTotalAmount } from '../../../../store/distribution/distribution.selectors';
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes.guard';
import { LoggerService } from '../../../../core/services/logger.service';

interface DistributionViewModel {
  client: Client | null;
  articles: Article[];
  quantities: { [key: string]: number };
  totalAmount: number;
  dailyPayment: number;
  adjustedAdvance: number;
}

@Component({
  selector: 'app-edit-distribution',
  templateUrl: './edit-distribution.page.html',
  styleUrls: ['./edit-distribution.page.scss'],
  standalone: false
})
export class EditDistributionPage implements OnInit, OnDestroy, CanComponentDeactivate {
  private destroy$ = new Subject<void>();

  distributionId!: string;
  originalDistribution!: Distribution;
  hasRecovery = false;
  private isInitializing = true; // Flag pour éviter le recalcul pendant le chargement

  distributionForm: FormGroup;
  vm$!: Observable<DistributionViewModel>;
  Object = Object; // Expose Object to the template

  private searchTerm$ = new BehaviorSubject<string>('');
  private dailyPayment$ = new BehaviorSubject<number>(0);
  private adjustedAdvance$ = new BehaviorSubject<number>(0);
  private paymentPeriod$ = new BehaviorSubject<number>(30);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController,
    private store: Store,
    private actions$: Actions,
    private fb: FormBuilder,
    private distributionService: DistributionService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private log: LoggerService
  ) {
    this.distributionForm = this.fb.group({ advance: [0] });
  }

  async ngOnInit() {
    this.log.log('[EditDistributionPage] Initializing...');
    this.distributionId = this.route.snapshot.paramMap.get('id')!;
    if (!this.distributionId) {
      this.router.navigate(['/tabs/distributions']);
      return;
    }

    // Configurer le ViewModel d'abord pour qu'il puisse écouter les changements
    this.setupViewModel();
    this.setupActionListeners();
    
    // Puis charger les données qui vont mettre à jour le store
    await this.loadDistributionData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewDidLeave() {
    this.log.log('[EditDistributionPage] Leaving page, resetting state.');
    this.store.dispatch(DistributionActions.resetDistributionState());
  }

  private setupViewModel() {
    const availableArticles$ = this.store.select(selectAvailableArticles);
    const articleQuantities$ = this.store.select(selectArticleQuantities);

    const filteredArticles$ = combineLatest([
      availableArticles$,
      articleQuantities$,
      this.searchTerm$.pipe(startWith(''), distinctUntilChanged())
    ]).pipe(
      map(([articles, quantities, searchTerm]) => this.filterArticles(articles, quantities, searchTerm))
    );

    this.vm$ = combineLatest({
      client: this.store.select(selectSelectedClient),
      articles: filteredArticles$,
      quantities: articleQuantities$,
      totalAmount: this.store.select(selectDistributionTotalAmount),
      dailyPayment: this.dailyPayment$.asObservable(),
      adjustedAdvance: this.adjustedAdvance$.asObservable()
    });

    this.setupCalculationPipeline();
  }

  private async loadDistributionData() {
    const loading = await this.loadingController.create({ message: 'Chargement...' });
    await loading.present();
    try {
      const distribution = await firstValueFrom(this.distributionService.getDistributionById(this.distributionId));
      if (!distribution) throw new Error('Distribution not found');
      this.originalDistribution = distribution;



      this.store.dispatch(DistributionActions.loadAvailableArticles());

      if (distribution.client) {
        this.store.dispatch(DistributionActions.setSelectedClient({ client: distribution.client }));
      }

      const items = await firstValueFrom(this.distributionService.getDistributionItems(this.distributionId));
      items.forEach(item => {
        this.store.dispatch(DistributionActions.updateArticleQuantity({ articleId: item.articleId, quantity: item.quantity }));
      });

      // Attendre que les données du store soient mises à jour
      setTimeout(() => {
        this.initializeOriginalValues(distribution);
      }, 100);

    } catch (error) {
      this.presentErrorAlert('Erreur', 'Impossible de charger les données de la distribution.');
      this.router.navigate(['/tabs/distributions']);
    } finally {
      await loading.dismiss();
    }
  }

  private initializeOriginalValues(distribution: Distribution) {
    // Charger les valeurs originales sans déclencher le recalcul
    const originalAdvance = distribution.advance || 0;
    const originalDailyPayment = distribution.dailyPayment || 0;
    
    // Définir les valeurs directement dans les BehaviorSubjects
    this.adjustedAdvance$.next(originalAdvance);
    this.dailyPayment$.next(originalDailyPayment);
    
    // Mettre à jour le formulaire sans déclencher valueChanges
    this.distributionForm.patchValue({ advance: originalAdvance }, { emitEvent: false });
    
    // Permettre le recalcul après l'initialisation
    setTimeout(() => {
      this.isInitializing = false;
    }, 200);
  }

  private setupCalculationPipeline() {
    const advanceControl = this.distributionForm.get('advance');
    if (!advanceControl) return;

    // Écouter les changements du montant total ET de l'avance
    const totalAmount$ = this.store.select(selectDistributionTotalAmount).pipe(distinctUntilChanged());
    const advance$ = advanceControl.valueChanges.pipe(
      startWith(advanceControl.value || 0),
      map(value => Number(value) || 0),
      distinctUntilChanged()
    );

    combineLatest([totalAmount$, advance$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([totalAmount, advance]) => {
        // Ne pas recalculer pendant l'initialisation pour préserver les valeurs originales
        if (this.isInitializing) {
          return;
        }

        // Recalculer quand le montant total OU l'avance change
        const { dailyPayment, adjustedAdvance, paymentPeriod } = this.calculatePaymentDetails(totalAmount, advance);
        this.dailyPayment$.next(dailyPayment);
        this.adjustedAdvance$.next(adjustedAdvance);
        this.paymentPeriod$.next(paymentPeriod);

        // Mettre à jour le champ seulement si la valeur calculée est différente
        if (Math.abs(advanceControl.value - adjustedAdvance) > 0.01) {
          advanceControl.setValue(adjustedAdvance, { emitEvent: false });
        }
      });
  }

  private setupActionListeners() {
    this.actions$.pipe(
      ofType(DistributionActions.updateDistributionSuccess),
      takeUntil(this.destroy$)
    ).subscribe(async () => {
      await this.toastController.create({ message: 'Distribution modifiée avec succès', duration: 3000, color: 'success', position: 'top' }).then(t => t.present());
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

    const originalStartDate = new Date(this.originalDistribution.startDate);
    const newEndDate = new Date(originalStartDate);
    newEndDate.setDate(originalStartDate.getDate() + this.paymentPeriod$.value);

    const distributionData = {
      id: this.distributionId,
      clientId: vm.client.id,
      articles: Object.entries(vm.quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([articleId, quantity]) => ({ articleId, quantity })),
      totalAmount: vm.totalAmount,
      advance: vm.adjustedAdvance,
      remainingAmount: vm.totalAmount - vm.adjustedAdvance,
      dailyPayment: vm.dailyPayment,
      startDate: this.originalDistribution.startDate, // Conserver la date de début originale
      endDate: newEndDate.toISOString(), // Calculer la nouvelle date de fin à partir de la date de début originale
      client: vm.client
    };

    this.store.dispatch(DistributionActions.updateDistribution({ distributionData }));
  }

  canDeactivate(): Observable<boolean> | boolean {
    return this.vm$.pipe(take(1), switchMap((vm: DistributionViewModel) => {
      const hasChanges = this.detectChanges(vm);
      if (!hasChanges) return of(true);
      return new Observable<boolean>(observer => {
        this.alertController.create({
          header: 'Quitter la page ?',
          message: 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?',
          buttons: [
            { text: 'Annuler', role: 'cancel', handler: () => { observer.next(false); observer.complete(); } },
            { text: 'Quitter', handler: () => { observer.next(true); observer.complete(); } }
          ]
        }).then(alert => alert.present());
      });
    }));
  }

  private detectChanges(vm: DistributionViewModel): boolean {
    if (!this.originalDistribution) return false;
    if (this.originalDistribution.advance !== vm.adjustedAdvance) return true;
    return false;
  }

  private filterArticles(articles: Article[], quantities: { [key: string]: number }, searchTerm: string): Article[] {
    const selectedArticleIds = Object.keys(quantities).filter(id => quantities[id] > 0);
    const searchTermLower = searchTerm.toLowerCase();

    if (!searchTerm.trim()) {
      const unselected = articles.filter(a => !selectedArticleIds.includes(a.id)).slice(0, 10);
      const selected = articles.filter(a => selectedArticleIds.includes(a.id));
      return [...unselected, ...selected];
    }

    return articles.filter(article =>
      article.name.toLowerCase().includes(searchTermLower) ||
      article.commercialName?.toLowerCase().includes(searchTermLower) ||
      article.reference?.toLowerCase().includes(searchTermLower)
    );
  }

  private calculatePaymentDetails(totalAmount: number, userAdvance: number) {
    if (totalAmount <= 0) {
      return { dailyPayment: 0, adjustedAdvance: 0, paymentPeriod: 30 };
    }

    // Étape 1: Calcul automatique du système (sans avance utilisateur)
    const systemCalculation = this.calculateSystemAdvance(totalAmount);
    
    // Étape 2: Si l'utilisateur a saisi une avance, recalculer
    if (userAdvance > 0 && userAdvance !== systemCalculation.adjustedAdvance) {
      const userCalculation = this.calculateWithUserAdvance(totalAmount, userAdvance);
      
      // Si le calcul avec l'avance utilisateur donne une avance négative, 
      // on revient au calcul système
      if (userCalculation.adjustedAdvance < 0) {
        return systemCalculation;
      }
      
      return userCalculation;
    }

    return systemCalculation;
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
    
    return {
      dailyPayment: roundedDailyPayment,
      adjustedAdvance: Math.max(0, systemAdvance),
      paymentPeriod: paymentDays
    };
  }

  private calculateWithUserAdvance(totalAmount: number, userAdvance: number) {
    // Montant restant après l'avance utilisateur
    const remainingAmount = totalAmount - userAdvance;
    
    if (remainingAmount <= 0) {
      return {
        dailyPayment: 0,
        adjustedAdvance: Math.max(0, totalAmount), // Tout est payé en avance
        paymentPeriod: 0
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
    
    // Avance finale = avance utilisateur + ajustement (jamais négative)
    const finalAdvance = Math.max(0, userAdvance + adjustment);
    
    return {
      dailyPayment: roundedDailyPayment,
      adjustedAdvance: finalAdvance,
      paymentPeriod: paymentDays
    };
  }

  async presentErrorAlert(header: string, message: string) {
    const alert = await this.alertController.create({ header, message, buttons: ['OK'], cssClass: 'error-alert' });
    await alert.present();
  }
}