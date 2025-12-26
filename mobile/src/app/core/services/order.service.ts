import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Order } from '../../models/order.model';
import { OrderItem } from '../../models/order-item.model';
import { Article } from '../../models/article.model';
import { ApiResponse } from '../../models/api-response.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { HealthCheckService } from './health-check.service';

interface CreateOrderData {
  clientId: string;
  articles: Array<{ articleId: string; quantity: number }>;
  totalAmount: number;
  client?: any;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private commercialUsername: string | undefined;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private store: Store,
    private healthCheckService: HealthCheckService
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  // Get orders from local database only
  getOrders(): Observable<Order[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    return from(this.dbService.getOrders(this.commercialUsername)).pipe(
      map(orders => {
        return orders;
      }),
      catchError(error => {
        console.error('Failed to load orders from local database:', error);
        return of([]);
      })
    );
  }

  // Get order by ID from local database
  getOrderById(orderId: string): Observable<Order | undefined> {
    if (!this.commercialUsername) {
      return of(undefined);
    }
    return from(this.dbService.getOrders(this.commercialUsername)).pipe(
      map(orders => orders.find(o => o.id === orderId)),
      catchError(error => {
        console.error('Failed to get order by ID:', error);
        return of(undefined);
      })
    );
  }

  // Get order items by order ID from local database
  getOrderItems(orderId: string): Observable<OrderItem[]> {
    return from(this.dbService.getItemsForOrder(orderId)).pipe(
      map(items => {
        return items;
      }),
      catchError(error => {
        console.error(`Failed to get items for order ${orderId}:`, error);
        return of([]);
      })
    );
  }

  // Get available articles from local database (no stock check for orders)
  getAvailableArticles(): Observable<Article[]> {
    return from(this.dbService.getArticles()).pipe(
      map(articles => {
        // Pour les commandes, on retourne tous les articles (pas de vérification de stock)
        return articles;
      }),
      catchError(error => {
        console.error('Failed to load articles from local database:', error);
        return of([]);
      })
    );
  }

  // Create a new order - save to local database only (no stock update)
  createOrder(orderData: CreateOrderData): Observable<Order> {
    return from(this.createLocalOrder(orderData)).pipe(
      map(order => {
        return order;
      }),
      catchError(error => {
        console.error('Failed to create order locally:', error);
        throw error;
      })
    );
  }

  private async createLocalOrder(orderData: CreateOrderData): Promise<Order> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    const now = new Date().toISOString();
    const allOrders = await this.dbService.getOrders(this.commercialUsername);
    const newCount = (allOrders.length + 1).toString().padStart(6, '0');
    const commercialCode = this.commercialUsername?.slice(-2).toUpperCase() || 'XX';
    const reference = `CMD-${commercialCode}-${newCount}`;

    // Create order items
    const allArticles = await this.dbService.getArticles();
    const orderItems: OrderItem[] = orderData.articles.map(item => {
      const articleDetails = allArticles.find(a => a.id === item.articleId);
      const unitPrice = articleDetails?.creditSalePrice || 0;
      return {
        id: `o-item-${Date.now()}-${item.articleId}`,
        orderId: `local-order-${Date.now()}`,
        articleId: item.articleId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: unitPrice * item.quantity
      };
    });

    const order: Order = {
      id: `local-order-${Date.now()}`,
      reference,
      totalAmount: orderData.totalAmount,
      advance: 0, // Les commandes n'ont pas d'avance
      remainingAmount: orderData.totalAmount,
      dailyPayment: 0, // Pas de mise journalière pour les commandes
      startDate: now,
      endDate: '', // Pas de date de fin pour les commandes
      status: 'PENDING', // Statut initial pour les commandes
      clientId: orderData.clientId,
      commercialId: this.commercialUsername || 'unknown',
      isLocal: true,
      isSync: false,
      syncDate: '',
      createdAt: now,
      client: orderData.client,
      articleCount: orderData.articles.length,
      syncHash: '',
      items: orderItems
    };

    // Update order items with correct orderId
    orderItems.forEach(item => {
      item.orderId = order.id;
      item.id = `o-item-${order.id}-${item.articleId}`;
    });

    // Save order and items in a single transaction using the new method
    await this.dbService.saveOrdersAndItems([order]);

    // Create transaction for history (optional for orders)
    await this.dbService.addTransaction({
      id: `trans-${order.id}`,
      clientId: order.clientId,
      referenceId: order.reference,
      type: 'ORDER',
      amount: order.totalAmount,
      details: `Commande de ${orderData.articles.length} article(s) pour ${orderData.client?.fullName || 'client inconnu'}`,
      date: order.createdAt,
      isSync: false,
      isLocal: true
    });

    // NOTE: Pas de mise à jour du stock pour les commandes

    return order;
  }

  // Update order locally
  updateOrder(orderData: any): Observable<Order> {
    return from(this.updateOrderLocally(orderData)).pipe(
      catchError(error => {
        console.error('Failed to update order:', error);
        throw error;
      })
    );
  }

  private async updateOrderLocally(orderData: any): Promise<Order> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      const orders = await this.dbService.getOrders(this.commercialUsername);
      const originalOrder = orders.find(o => o.id === orderData.id);

      if (!originalOrder) {
        throw new Error('Order not found');
      }

      // Create updated order items
      const allArticles = await this.dbService.getArticles();
      const orderItems: OrderItem[] = orderData.articles.map((article: any, index: number) => {
        const articleDetails = allArticles.find(a => a.id === article.articleId);
        const unitPrice = articleDetails?.creditSalePrice || 0;
        return {
          id: `${orderData.id}-item-${index + 1}`,
          orderId: orderData.id,
          articleId: article.articleId,
          quantity: article.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * article.quantity
        };
      });

      // Create updated order
      const updatedOrder: Order = {
        ...originalOrder,
        totalAmount: orderData.totalAmount,
        articleCount: orderData.articles.length,
        isSync: false,
        syncDate: new Date().toISOString(),
        items: orderItems
      };

      // Save order and items in a single transaction
      await this.dbService.saveOrdersAndItems([updatedOrder]);

      return updatedOrder;
    } catch (error) {
      console.error('Failed to update order locally:', error);
      throw error;
    }
  }

  // Delete order locally
  deleteOrder(orderId: string): Observable<boolean> {
    return from(this.deleteOrderLocally(orderId)).pipe(
      catchError(error => {
        console.error('Failed to delete order:', error);
        return of(false);
      })
    );
  }

  private async deleteOrderLocally(orderId: string): Promise<boolean> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      console.log(`Starting deletion of order: ${orderId}`);

      // Get order
      const orders = await this.dbService.getOrders(this.commercialUsername);
      const orderToDelete = orders.find(o => o.id === orderId);

      if (!orderToDelete) {
        throw new Error('Order not found');
      }

      // Delete order items
      const orderItems = await this.dbService.getOrderItems();
      const filteredItems = orderItems.filter(item => item.orderId !== orderId);
      await this.dbService.saveOrderItems(filteredItems);

      // Delete the order itself
      const filteredOrders = orders.filter(o => o.id !== orderId);
      await this.dbService.saveOrders(filteredOrders);

      console.log(`Successfully deleted order ${orderId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete order locally:', error);
      return false;
    }
  }

  // Get orders by client ID
  getOrdersByClient(clientId: string): Observable<Order[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    return from(this.dbService.getOrders(this.commercialUsername)).pipe(
      map(orders => orders.filter(o => o.clientId === clientId)),
      catchError(error => {
        console.error('Failed to get orders by client:', error);
        return of([]);
      })
    );
  }

  // Get pending orders (for sync)
  getPendingOrders(): Observable<Order[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    return from(this.dbService.getOrders(this.commercialUsername)).pipe(
      map(orders => orders.filter(o => !o.isSync && o.isLocal)),
      catchError(error => {
        console.error('Failed to get pending orders:', error);
        return of([]);
      })
    );
  }

  // Mark order as synced
  markOrderAsSynced(orderId: string): Observable<boolean> {
    return from(this.markOrderAsSyncedLocally(orderId)).pipe(
      catchError(error => {
        console.error('Failed to mark order as synced:', error);
        return of(false);
      })
    );
  }

  private async markOrderAsSyncedLocally(orderId: string): Promise<boolean> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      const orders = await this.dbService.getOrders(this.commercialUsername);
      const orderIndex = orders.findIndex(o => o.id === orderId);

      if (orderIndex === -1) {
        return false;
      }

      orders[orderIndex] = {
        ...orders[orderIndex],
        isSync: true,
        syncDate: new Date().toISOString()
      };

      await this.dbService.saveOrders(orders);
      return true;
    } catch (error) {
      console.error('Failed to mark order as synced:', error);
      return false;
    }
  }
}
