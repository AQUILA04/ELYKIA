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
    private log: LoggerService
  ) {}

  get canModify(): boolean {
    return this.order?.status === 'PENDING';
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
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'ACCEPTED': return 'Acceptée';
      case 'DENIED': return 'Refusée';
      case 'CANCEL': return 'Annulée';
      case 'SOLD': return 'Vendue';
      default: return status || '—';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'ACCEPTED': return 'status-accepted';
      case 'DENIED': return 'status-denied';
      case 'CANCEL': return 'status-cancel';
      case 'SOLD': return 'status-sold';
      default: return 'status-pending';
    }
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
