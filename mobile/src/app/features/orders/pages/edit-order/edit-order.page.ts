import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { TransactionConfig, TransactionData } from '../../../../shared/components/base-transaction/base-transaction.component';
import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';
import { OrderService } from '../../../../core/services/order.service';
import { ClientService } from '../../../../core/services/client.service';
import { Order } from '../../../../models/order.model';
import { LoggerService } from '../../../../core/services/logger.service';
import { Client } from '../../../../models/client.model';
import { Article } from '../../../../models/article.model';

@Component({
  selector: 'app-edit-order',
  templateUrl: './edit-order.page.html',
  styleUrls: ['./edit-order.page.scss'],
  standalone: false
})
export class EditOrderPage implements OnInit {
  orderId!: string;
  originalOrder!: Order;

  config: TransactionConfig;
  availableArticles: Article[] = [];
  selectedClient: Client | null = null;
  initialData: { articles: Array<{ articleId: string; quantity: number }>; totalAmount?: number; advance?: number } | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private orderService: OrderService,
    private clientService: ClientService,
    private log: LoggerService
  ) {
    this.config = {
      type: 'ORDER',
      checkStock: false,
      updateStock: false,
      showStockInfo: false,
      maxQuantityCheck: false,
      requiresAdvance: false,
      calculateDailyPayment: false,
      title: 'Modifier Commande',
      submitButtonText: 'MODIFIER LA COMMANDE',
      backRoute: '/tabs/orders'
    };
  }

  async ngOnInit() {
    this.log.log('[EditOrderPage] User entered edit order page.');

    this.orderId = this.route.snapshot.paramMap.get('id')!;

    if (!this.orderId) {
      this.router.navigate(['/tabs/orders']);
      return;
    }

    this.config = {
      ...this.config,
      backRoute: `/tabs/orders/detail/${this.orderId}`
    };

    await this.loadData();
    await this.loadOrderData();
  }

  private async loadOrderData() {
    let loading: HTMLIonLoadingElement | null = null;
    try {
      loading = await this.loadingController.create({
        message: 'Chargement des données...'
      });
      await loading.present();

      const order = await firstValueFrom(this.orderService.getOrderById(this.orderId));

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'PENDING') {
        await this.showErrorMessage('Seules les commandes en attente peuvent être modifiées.');
        this.router.navigate(['/tabs/orders/detail', this.orderId]);
        return;
      }

      this.originalOrder = order;

      const items = await firstValueFrom(this.orderService.getOrderItems(this.orderId));

      if (order.client) {
        this.selectedClient = order.client;
      } else if (order.clientId) {
        try {
          this.selectedClient = await this.clientService.getClientById(order.clientId);
        } catch (error) {
          console.error('[EditOrder] Failed to hydrate client:', error);
          this.selectedClient = null;
        }
      }

      this.initialData = {
        articles: items.map(item => ({
          articleId: item.articleId,
          quantity: item.quantity
        })),
        totalAmount: order.totalAmount
      };
    } catch (error) {
      console.error('Error loading order data:', error);
      await this.showErrorMessage('Impossible de charger les données de la commande.');
      this.router.navigate(['/tabs/orders']);
    } finally {
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  private async loadData() {
    try {
      this.availableArticles = await firstValueFrom(this.orderService.getAvailableArticles());
    } catch (error) {
      console.error('Error loading data for edit order:', error);
      await this.showErrorMessage('Erreur lors du chargement des données');
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
      await this.showErrorMessage('Veuillez sélectionner un client.');
      return;
    }

    if (this.originalOrder?.status !== 'PENDING') {
      await this.showErrorMessage('Seules les commandes en attente peuvent être modifiées.');
      return;
    }

    let loading: HTMLIonLoadingElement | null = null;

    try {
      loading = await this.loadingController.create({
        message: 'Modification en cours...'
      });
      await loading.present();

      const orderData = {
        id: this.orderId,
        clientId: data.clientId || this.selectedClient.id,
        articles: data.articles,
        totalAmount: data.totalAmount,
        client: data.client || this.selectedClient
      };

      await firstValueFrom(this.orderService.updateOrder(orderData));

      await loading.dismiss();
      loading = null;

      const toast = await this.toastController.create({
        message: 'Commande modifiée avec succès',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      this.router.navigate(['/tabs/orders/detail', this.orderId]);
    } catch (error: any) {
      console.error('Error updating order:', error);

      if (loading) {
        await loading.dismiss();
      }

      await this.showErrorMessage(error?.message || 'Erreur lors de la modification de la commande');
    }
  }

  private async showErrorMessage(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  ionViewDidLeave() {
    this.log.log('[EditOrderPage] User left edit order page.');
  }
}
