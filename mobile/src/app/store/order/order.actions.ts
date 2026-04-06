import { createAction, props } from '@ngrx/store';
import { Order } from '../../models/order.model';
import { OrderView } from '../../models/order-view.model'; // Ensure this exists

// Existing Actions (if any, keeping structure consistent)
export const loadOrders = createAction(
    '[Order] Load Orders'
);

export const loadOrdersSuccess = createAction(
    '[Order] Load Orders Success',
    props<{ orders: Order[] }>()
);

export const loadOrdersFailure = createAction(
    '[Order] Load Orders Failure',
    props<{ error: any }>()
);

export const createOrder = createAction(
    '[Order] Create Order',
    props<{ order: Order }>()
);

export const createOrderSuccess = createAction(
    '[Order] Create Order Success',
    props<{ order: Order }>()
);

export const createOrderFailure = createAction(
    '[Order] Create Order Failure',
    props<{ error: any }>()
);

// Pagination Actions
export const loadFirstPageOrders = createAction(
    '[Order] Load First Page Orders',
    props<{ filters?: { status?: string; clientId?: string; searchQuery?: string; dateFilter?: any; quarter?: string; isLocal?: boolean; isSync?: boolean } }>()
);

export const loadFirstPageOrdersSuccess = createAction(
    '[Order] Load First Page Orders Success',
    props<{ orders: OrderView[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageOrdersFailure = createAction(
    '[Order] Load First Page Orders Failure',
    props<{ error: string }>()
);

export const loadNextPageOrders = createAction(
    '[Order] Load Next Page Orders',
    props<{ filters?: { status?: string; clientId?: string; searchQuery?: string; dateFilter?: any; quarter?: string; isLocal?: boolean; isSync?: boolean } }>()
);

export const loadNextPageOrdersSuccess = createAction(
    '[Order] Load Next Page Orders Success',
    props<{ orders: OrderView[] }>()
);

export const loadNextPageOrdersFailure = createAction(
    '[Order] Load Next Page Orders Failure',
    props<{ error: string }>()
);

export const resetOrderPagination = createAction(
    '[Order] Reset Order Pagination'
);
