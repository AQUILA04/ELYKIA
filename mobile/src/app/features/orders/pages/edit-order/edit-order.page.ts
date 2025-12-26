import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { TransactionConfig, TransactionData } from '../../../../shared/components/base-transaction/base-transaction.component';
import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';
import { OrderService } from '../../../../core/services/order.service';
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

  // Configuration et données
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
    private log: LoggerService
  ) {
    // Configuration spécifique aux commandes
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
    
    // Get order ID from route
    this.orderId = this.route.snapshot.paramMap.get('id')!;
    
    if (!this.orderId) {
      this.router.navigate(['/tabs/orders']);
      return;
    }

    await this.loadData();
    await this.loadOrderData();
  }

  private async loadOrderData() {
    try {
      const loading = await this.loadingController.create({
        message: 'Chargement des données...'
      });
      await loading.present();

      // Load order data
      const order = await firstValueFrom(this.orderService.getOrderById(this.orderId));
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      this.originalOrder = order;
      
      // Load order items first
      const items = await firstValueFrom(this.orderService.getOrderItems(this.orderId));
      
      // Set client
      if (order.client) {
        this.selectedClient = order.client;
        console.log('[EditOrder] Client set:', this.selectedClient);
      }
      
      // Préparer les données initiales pour le composant base-transaction
      this.initialData = {
        articles: items.map(item => ({
          articleId: item.articleId,
          quantity: item.quantity
        })),
        totalAmount: order.totalAmount
      };
      
      console.log('[EditOrder] Initial data prepared:', this.initialData);
      
      // Forcer la détection de changement après un petit délai
      setTimeout(() => {
        console.log('[EditOrder] Forcing change detection');
      }, 100);

      await loading.dismiss();
    } catch (error) {
      console.error('Error loading order data:', error);
      await this.showErrorMessage('Impossible de charger les données de la commande.');
      this.router.navigate(['/tabs/orders']);
    }
  }

  private async loadData() {
    try {
      // Charger les articles disponibles
      this.availableArticles = await firstValueFrom(this.orderService.getAvailableArticles());
      console.log(`Loaded ${this.availableArticles.length} articles for order edit`);
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
      console.error('No client selected');
      return;
    }

    let loading: any = null;

    try {
      loading = await this.loadingController.create({
        message: 'Modification en cours...'
      });
      await loading.present();

      const orderData = {
        id: this.orderId,
        clientId: data.clientId,
        articles: data.articles,
        totalAmount: data.totalAmount,
        client: data.client
      };

      await firstValueFrom(this.orderService.updateOrder(orderData));
      
      await loading.dismiss();
      loading = null;

      // Afficher un message de succès
      const toast = await this.toastController.create({
        message: 'Commande modifiée avec succès',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Rediriger vers la liste des commandes
      this.router.navigate(['/tabs/orders']);

    } catch (error) {
      console.error('Error updating order:', error);
      
      // S'assurer que le loading est fermé en cas d'erreur
      if (loading) {
        await loading.dismiss();
      }
      
      await this.showErrorMessage('Erreur lors de la modification de la commande');
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