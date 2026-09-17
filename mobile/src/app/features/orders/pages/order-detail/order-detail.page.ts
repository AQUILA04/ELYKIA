import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { firstValueFrom, Subject } from 'rxjs';

import { OrderService } from '../../../../core/services/order.service';
import { ClientService } from '../../../../core/services/client.service';
import { Order } from '../../../../models/order.model';
import { OrderItem } from '../../../../models/order-item.model';
import { Client } from '../../../../models/client.model';
import { LoggerService } from '../../../../core/services/logger.service';
import { HybridSyncUiService } from '../../../../core/services/hybrid-sync-ui.service';
import { OnlineWriteError, WriteErrorKind } from '../../../../core/services/online-first-write.types';
import {
  canAcceptOrder,
  canCancelOrder,
  canDeliverOrder,
  canModifyOrder,
  getOrderStatusClass,
  getOrderStatusLabel,
  OrderStatusValue
} from '../../../../core/utils/order-status.util';
import * as OrderActions from '../../../../store/order/order.actions';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: false
})
export class OrderDetailPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  orderId!: string;
  order: Order | null = null;
  items: OrderItem[] = [];
  client: Client | null = null;
  clientName = '';
  isLoading = true;
  loadError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private clientService: ClientService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private store: Store,
    private log: LoggerService,
    private hybridSyncUiService: HybridSyncUiService
  ) {}

  get canModify(): boolean {
    return !!this.order && canModifyOrder(this.order.status);
  }

  get canAccept(): boolean {
    return !!this.order && canAcceptOrder(this.order.status);
  }

  get canCancel(): boolean {
    return !!this.order && canCancelOrder(this.order.status);
  }

  get canDeliver(): boolean {
    return !!this.order && canDeliverOrder(this.order.status);
  }

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.orderId) {
      this.router.navigate(['/tabs/orders']);
      return;
    }
    this.log.log(`[OrderDetailPage] Open detail ${this.orderId}`);
  }

  ionViewWillEnter() {
    if (this.orderId) {
      this.loadDetail();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadDetail() {
    this.isLoading = true;
    this.loadError = null;

    try {
      const order = await firstValueFrom(this.orderService.getOrderById(this.orderId));
      if (!order) {
        this.loadError = 'Commande introuvable.';
        this.order = null;
        return;
      }

      this.order = order;
      this.items = await firstValueFrom(this.orderService.getOrderItems(this.orderId));

      if (order.client) {
        this.client = order.client;
        this.clientName = order.client.fullName
          || `${order.client.firstname || ''} ${order.client.lastname || ''}`.trim();
      } else if (order.clientId) {
        try {
          this.client = await this.clientService.getClientById(order.clientId);
          this.clientName = this.client?.fullName
            || `${this.client?.firstname || ''} ${this.client?.lastname || ''}`.trim();
        } catch {
          this.client = null;
          this.clientName = 'Client inconnu';
        }
      } else {
        this.clientName = 'Client inconnu';
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      this.loadError = 'Impossible de charger la commande.';
      this.order = null;
    } finally {
      this.isLoading = false;
    }
  }

  getStatusLabel(status: string): string {
    return getOrderStatusLabel(status);
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status);
  }

  goBack() {
    this.router.navigate(['/tabs/orders']);
  }

  editOrder() {
    if (!this.canModify || !this.order) {
      this.showToast('Seules les commandes en attente peuvent être modifiées.', 'warning');
      return;
    }
    this.router.navigate(['/tabs/orders/edit', this.order.id]);
  }

  async acceptOrder() {
    await this.confirmAndChangeStatus('ACCEPTED', 'Accepter la commande',
      'Confirmer l\'acceptation de cette commande ?', 'Commande acceptée');
  }

  async cancelOrderStatus() {
    await this.confirmAndChangeStatus('CANCEL', 'Annuler la commande',
      'Confirmer l\'annulation de cette commande ?', 'Commande annulée');
  }

  deliverOrder() {
    if (!this.canDeliver || !this.order) {
      this.showToast('Cette commande ne peut pas être livrée.', 'warning');
      return;
    }
    this.router.navigate(['/distributions/new'], {
      queryParams: { orderId: this.order.id }
    });
  }

  private async confirmAndChangeStatus(
    newStatus: OrderStatusValue,
    header: string,
    message: string,
    successMessage: string
  ) {
    if (!this.order) {
      return;
    }
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Retour', role: 'cancel' },
        {
          text: 'Confirmer',
          handler: () => {
            void this.performStatusChange(newStatus, successMessage);
          }
        }
      ]
    });
    await alert.present();
  }

  private async performStatusChange(
    newStatus: OrderStatusValue,
    successMessage: string,
    forceOffline = false
  ) {
    if (!this.order) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Mise à jour du statut...'
    });
    await loading.present();

    try {
      const updated = await firstValueFrom(
        this.orderService.updateOrderStatus(this.order.id, newStatus, { forceOffline })
      );
      this.order = updated;
      this.store.dispatch(OrderActions.loadFirstPageOrders({ filters: {} }));
      await this.showToast(successMessage, 'success');
    } catch (error) {
      if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS) {
        await loading.dismiss();
        const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
        if (saveOffline) {
          await this.performStatusChange(newStatus, successMessage, true);
          return;
        }
        return;
      }
      console.error('Error updating order status:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut';
      await this.showToast(message, 'danger');
    } finally {
      try {
        await loading.dismiss();
      } catch {
        // already dismissed
      }
    }
  }

  async deleteOrder() {
    if (!this.canModify || !this.order) {
      this.showToast('Seules les commandes en attente peuvent être supprimées.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer la commande ${this.order.reference} ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.performDelete();
          }
        }
      ]
    });
    await alert.present();
  }

  private async performDelete() {
    if (!this.order) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();

    try {
      const success = await firstValueFrom(this.orderService.deleteOrder(this.order.id));
      if (success) {
        await this.showToast(`Commande ${this.order.reference} supprimée`, 'success');
        this.store.dispatch(OrderActions.loadFirstPageOrders({ filters: {} }));
        this.router.navigate(['/tabs/orders']);
      } else {
        await this.showToast('Erreur lors de la suppression', 'danger');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      await this.showToast('Erreur lors de la suppression', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
