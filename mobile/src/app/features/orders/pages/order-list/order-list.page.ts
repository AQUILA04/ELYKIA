import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OrderService } from '../../../../core/services/order.service';
import { Order } from '../../../../models/order.model';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.page.html',
  styleUrls: ['./order-list.page.scss'],
  standalone: false
})
export class OrderListPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchTerm = '';
  isLoading = false;

  constructor(
    private router: Router,
    private orderService: OrderService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private log: LoggerService
  ) {}

  ngOnInit() {
    this.log.log('[OrderListPage] User entered order list page.');
    this.loadOrders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    // Recharger les commandes à chaque fois qu'on revient sur la page
    this.loadOrders();
  }

  async loadOrders() {
    this.isLoading = true;
    
    try {
      this.orderService.getOrders()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (orders) => {
            this.orders = orders;
            this.filteredOrders = [...orders];
            this.isLoading = false;
            console.log(`Loaded ${orders.length} orders`);
          },
          error: (error) => {
            console.error('Error loading orders:', error);
            this.isLoading = false;
            this.showErrorToast('Erreur lors du chargement des commandes');
          }
        });
    } catch (error) {
      console.error('Error in loadOrders:', error);
      this.isLoading = false;
      this.showErrorToast('Erreur lors du chargement des commandes');
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.filterOrders();
  }

  private filterOrders() {
    if (!this.searchTerm.trim()) {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(order => 
        order.reference.toLowerCase().includes(this.searchTerm) ||
        (order.client?.firstname?.toLowerCase().includes(this.searchTerm)) ||
        (order.client?.lastname?.toLowerCase().includes(this.searchTerm))
      );
    }
  }

  createNewOrder() {
    this.router.navigate(['/tabs/orders/new']);
  }

  editOrder(order: Order) {
    this.router.navigate(['/tabs/orders/edit', order.id]);
  }

  async deleteOrder(order: Order) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer la commande ${order.reference} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.performDelete(order);
          }
        }
      ]
    });

    await alert.present();
  }

  private async performDelete(order: Order) {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();

    try {
      const success = await this.orderService.deleteOrder(order.id).toPromise();
      
      if (success) {
        await this.showSuccessToast(`Commande ${order.reference} supprimée`);
        this.loadOrders(); // Recharger la liste
      } else {
        await this.showErrorToast('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      await this.showErrorToast('Erreur lors de la suppression');
    } finally {
      await loading.dismiss();
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'primary';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'medium';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'CONFIRMED': return 'Confirmée';
      case 'DELIVERED': return 'Livrée';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  }

  getAvatarColor(firstName: string): string {
    const colors = [
      '#FF6B35', '#2E8B57', '#4682B4', '#8B4513', '#9932CC',
      '#DC143C', '#008B8B', '#B8860B', '#8B008B', '#556B2F'
    ];
    const index = firstName ? firstName.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}