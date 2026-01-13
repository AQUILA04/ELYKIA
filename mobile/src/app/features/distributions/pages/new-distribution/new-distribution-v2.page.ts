import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, take } from 'rxjs/operators';

import { Client } from '../../../../models/client.model';
import { Article } from '../../../../models/article.model';
import { CommercialStockItem } from '../../../../models/commercial-stock-item.model';
import { Distribution } from '../../../../models/distribution.model';

import { selectAllClients } from '../../../../store/client/client.selectors';
import { selectAvailableStockItems } from '../../../../store/commercial-stock/commercial-stock.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';

import { DistributionService } from '../../../../core/services/distribution.service';
import { CommercialStockService } from '../../../../core/services/commercial-stock.service';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import * as CommercialStockActions from '../../../../store/commercial-stock/commercial-stock.actions';

interface DistributionViewModel {
  client: Client | null;
  availableStockItems: CommercialStockItem[];
  quantities: { [articleId: number]: number };
  totalAmount: number;
  dailyPayment: number;
  paymentPeriod: number;
  advance: number;
}

@Component({
  selector: 'app-new-distribution-v2',
  templateUrl: './new-distribution.page.html',
  styleUrls: ['./new-distribution.page.scss'],
})
export class NewDistributionV2Page implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  clients$: Observable<Client[]>;
  availableStockItems$: Observable<CommercialStockItem[]>;
  
  vm: DistributionViewModel = {
    client: null,
    availableStockItems: [],
    quantities: {},
    totalAmount: 0,
    dailyPayment: 0,
    paymentPeriod: 30,
    advance: 0
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private store: Store,
    private distributionService: DistributionService,
    private commercialStockService: CommercialStockService
  ) {
    this.clients$ = this.store.select(selectAllClients);
    this.availableStockItems$ = this.store.select(selectAvailableStockItems);
  }

  ngOnInit() {
    // Load commercial stock when page initializes
    this.store.select(selectAuthUser).pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user?.username) {
        this.store.dispatch(CommercialStockActions.loadCommercialStock({ 
          commercialUsername: user.username 
        }));
      }
    });

    // Subscribe to available stock items
    this.availableStockItems$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(stockItems => {
      this.vm.availableStockItems = stockItems;
      this.calculateTotalAmount();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClientSelected(client: Client) {
    this.vm.client = client;
  }

  onQuantityChanged(articleId: number, quantity: number) {
    if (quantity <= 0) {
      delete this.vm.quantities[articleId];
    } else {
      this.vm.quantities[articleId] = quantity;
    }
    this.calculateTotalAmount();
  }

  private calculateTotalAmount() {
    this.vm.totalAmount = Object.entries(this.vm.quantities)
      .reduce((total, [articleIdStr, quantity]) => {
        const articleId = parseInt(articleIdStr);
        const stockItem = this.vm.availableStockItems.find(item => item.articleId === articleId);
        if (stockItem) {
          return total + (stockItem.creditSalePrice * quantity);
        }
        return total;
      }, 0);
  }

  getMaxQuantityForArticle(articleId: number): number {
    const stockItem = this.vm.availableStockItems.find(item => item.articleId === articleId);
    return stockItem ? stockItem.quantityRemaining : 0;
  }

  getArticlePrice(articleId: number): number {
    const stockItem = this.vm.availableStockItems.find(item => item.articleId === articleId);
    return stockItem ? stockItem.creditSalePrice : 0;
  }

  async validateAndCreateDistribution() {
    // Validation des données
    if (!this.vm.client) {
      await this.presentErrorAlert('Client requis', 'Veuillez sélectionner un client.');
      return;
    }

    const selectedArticles = Object.entries(this.vm.quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([articleIdStr, quantity]) => ({
        articleId: parseInt(articleIdStr),
        quantity
      }));

    if (selectedArticles.length === 0) {
      await this.presentErrorAlert('Articles requis', 'Veuillez sélectionner au moins un article.');
      return;
    }

    if (this.vm.dailyPayment <= 0) {
      await this.presentErrorAlert('Paiement journalier requis', 'Veuillez saisir un montant de paiement journalier.');
      return;
    }

    // Vérification de la disponibilité des stocks (SIMPLIFIÉ)
    const stockAvailabilityDetails = await this.commercialStockService
      .getStockAvailabilityDetails(selectedArticles)
      .toPromise();

    const insufficientStockItems = stockAvailabilityDetails?.filter(detail => !detail.sufficient) || [];
    
    if (insufficientStockItems.length > 0) {
      const message = insufficientStockItems
        .map(item => `${item.articleName}: demandé ${item.requested}, disponible ${item.available}`)
        .join('\n');
      
      await this.presentErrorAlert('Stock insuffisant', `Stock insuffisant pour:\n${message}`);
      return;
    }

    // Création de la distribution (SANS creditId)
    await this.createDistribution(selectedArticles);
  }

  private async createDistribution(articles: Array<{articleId: number, quantity: number}>) {
    const loading = await this.loadingController.create({
      message: 'Création de la distribution...'
    });
    await loading.present();

    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + this.vm.paymentPeriod);

      const distributionData = {
        // PLUS DE creditId - Supprimé !
        type: 'CLIENT',
        clientId: this.vm.client!.id,
        articles: articles,
        totalAmount: this.vm.totalAmount,
        dailyPayment: this.vm.dailyPayment,
        advance: this.vm.advance,
        paidAmount: this.vm.advance,
        remainingAmount: this.vm.totalAmount - this.vm.advance,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        paymentPeriod: this.vm.paymentPeriod
      };

      // Créer la distribution
      const success = await this.distributionService.createDistribution(distributionData).toPromise();

      if (success) {
        // Réduire les quantités en stock
        await this.commercialStockService.reduceStockQuantities(articles).toPromise();
        
        // Recharger les données
        this.store.select(selectAuthUser).pipe(take(1)).subscribe(user => {
          if (user?.username) {
            this.store.dispatch(DistributionActions.loadDistributions({ 
              commercialUsername: user.username 
            }));
            this.store.dispatch(CommercialStockActions.loadCommercialStock({ 
              commercialUsername: user.username 
            }));
          }
        });

        await this.presentSuccessToast('Distribution créée avec succès');
        this.router.navigate(['/tabs/distributions']);
      } else {
        await this.presentErrorAlert('Erreur', 'Échec de la création de la distribution');
      }
    } catch (error) {
      console.error('Error creating distribution:', error);
      await this.presentErrorAlert('Erreur', 'Une erreur est survenue lors de la création');
    } finally {
      await loading.dismiss();
    }
  }

  private async presentErrorAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  // Méthodes utilitaires pour le template
  hasSelectedArticles(): boolean {
    return Object.keys(this.vm.quantities).length > 0;
  }

  getSelectedArticlesCount(): number {
    return Object.values(this.vm.quantities).filter(q => q > 0).length;
  }

  getTotalQuantity(): number {
    return Object.values(this.vm.quantities).reduce((sum, q) => sum + q, 0);
  }
}