import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { TransactionConfig, TransactionData } from '../../../../shared/components/base-transaction/base-transaction.component';
import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';
import { OrderService } from '../../../../core/services/order.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { HybridSyncUiService } from '../../../../core/services/hybrid-sync-ui.service';
import { OnlineWriteError, WriteErrorKind } from '../../../../core/services/online-first-write.types';
import { Client } from '../../../../models/client.model';
import { Article } from '../../../../models/article.model';

@Component({
  selector: 'app-new-order',
  templateUrl: './new-order.page.html',
  styleUrls: ['./new-order.page.scss'],
  standalone: false
})
export class NewOrderPage implements OnInit {

  // Configuration et données
  config: TransactionConfig;
  availableArticles: Article[] = [];
  selectedClient: Client | null = null;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private orderService: OrderService,
    private log: LoggerService,
    private hybridSyncUiService: HybridSyncUiService
  ) {
    // Configuration spécifique aux commandes
    this.config = {
      type: 'ORDER',
      checkStock: false,           // Pas de vérification de stock
      updateStock: false,          // Pas de mise à jour du stock
      showStockInfo: false,        // Pas d'affichage des infos de stock
      maxQuantityCheck: false,     // Pas de limite de quantité
      requiresAdvance: false,      // Pas d'avance pour les commandes
      calculateDailyPayment: false, // Pas de calcul de mise journalière
      title: 'Nouvelle Commande',
      submitButtonText: 'CRÉER LA COMMANDE',
      backRoute: '/tabs/orders'
    };
  }

  async ngOnInit() {
    this.log.log('[NewOrderPage] User entered new order page.');
    await this.loadData();
  }

  private async loadData() {
    try {
      // Charger les articles disponibles (tous les articles pour les commandes)
      this.availableArticles = await firstValueFrom(this.orderService.getAvailableArticles());
      console.log(`Loaded ${this.availableArticles.length} articles for order`);
    } catch (error) {
      console.error('Error loading data for new order:', error);
      const toast = await this.toastController.create({
        message: 'Erreur lors du chargement des données',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  async openClientSelector() {
    try {
      const modal = await this.modalController.create({
        component: ClientSelectorModalComponent,
        cssClass: 'client-selector-modal'
      });

      modal.onDidDismiss().then((result) => {
        if (result.data && result.data.client) {
          this.selectedClient = result.data.client;
        }
      });

      return await modal.present();
    } catch (error: any) {
      console.error('Error in openClientSelector:', error);
    }
  }

  async onSubmitTransaction(data: TransactionData) {
    if (!this.selectedClient) {
      console.error('No client selected');
      return;
    }

    await this.submitOrder(data);
  }

  private async submitOrder(data: TransactionData, forceOffline = false): Promise<void> {
    let loading: any = null;

    try {
      loading = await this.loadingController.create({
        message: 'Création de la commande...'
      });
      await loading.present();

      const orderData = {
        clientId: data.clientId,
        articles: data.articles,
        totalAmount: data.totalAmount,
        client: data.client,
        forceOffline
      };

      const createdOrder = await firstValueFrom(this.orderService.createOrder(orderData));

      await loading.dismiss();
      loading = null;

      const toast = await this.toastController.create({
        message: `Commande ${createdOrder.reference} créée avec succès`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      this.router.navigate(['/tabs/orders']);
    } catch (error) {
      if (loading) {
        await loading.dismiss();
        loading = null;
      }

      if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS) {
        const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
        if (saveOffline) {
          await this.submitOrder(data, true);
          return;
        }
      }

      console.error('Error creating order:', error);

      const message = error instanceof Error ? error.message : 'Erreur lors de la création de la commande';
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  ionViewDidLeave() {
    this.log.log('[NewOrderPage] User left new order page.');
  }
}