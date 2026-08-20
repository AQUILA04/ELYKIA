import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { InfiniteScrollCustomEvent, IonInfiniteScroll } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, take, takeUntil } from 'rxjs/operators';

import { OrderView } from '../../../../models/order-view.model';
import { User } from '../../../../models/auth.model';
import * as OrderActions from '../../../../store/order/order.actions';
import * as OrderSelectors from '../../../../store/order/order.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.page.html',
  styleUrls: ['./order-list.page.scss'],
  standalone: false
})
export class OrderListPage implements OnInit, OnDestroy {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  vm$: Observable<{
    orders: OrderView[];
    loading: boolean;
    error: string | null;
    totalItems: number;
    hasMore: boolean;
  }>;

  constructor(
    private store: Store,
    private router: Router,
    private log: LoggerService
  ) {
    this.vm$ = combineLatest([
      this.store.select(OrderSelectors.selectPaginatedOrders),
      this.store.select(OrderSelectors.selectOrderPaginationLoading),
      this.store.select(OrderSelectors.selectOrderPaginationError),
      this.store.select(OrderSelectors.selectOrderPaginationTotalItems),
      this.store.select(OrderSelectors.selectOrderPaginationHasMore)
    ]).pipe(
      map(([orders, loading, error, totalItems, hasMore]) => ({
        orders,
        loading,
        error,
        totalItems,
        hasMore
      }))
    );
  }

  ngOnInit() {
    this.log.log('[OrderListPage] User entered order list page.');

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.refreshList(query || '');
    });
  }

  ionViewWillEnter() {
    this.store.select(selectAuthUser).pipe(
      filter((user): user is User => !!user?.username),
      take(1)
    ).subscribe(() => {
      this.refreshList(this.searchControl.value || '');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshList(query: string) {
    this.store.dispatch(OrderActions.loadFirstPageOrders({
      filters: { searchQuery: query || undefined }
    }));
  }

  loadMoreData(event: InfiniteScrollCustomEvent) {
    this.store.dispatch(OrderActions.loadNextPageOrders({
      filters: { searchQuery: this.searchControl.value || undefined }
    }));

    this.store.select(OrderSelectors.selectOrderPaginationLoading).pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      event.target.complete();
    });
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  refreshOrders(event?: CustomEvent) {
    this.refreshList(this.searchControl.value || '');
    if (event?.target && 'complete' in (event.target as any)) {
      setTimeout(() => (event.target as any).complete(), 400);
    }
  }

  createNewOrder() {
    this.router.navigate(['/tabs/orders/new']);
  }

  openOrderDetail(order: OrderView) {
    this.router.navigate(['/tabs/orders/detail', order.id]);
  }

  retryLoad() {
    this.refreshList(this.searchControl.value || '');
  }

  trackByOrderId(_index: number, order: OrderView): string {
    return order.id;
  }
}
