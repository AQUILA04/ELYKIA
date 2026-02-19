import { createReducer, on } from '@ngrx/store';
import * as OrderActions from './order.actions';
import { Order } from '../../models/order.model';
import { PaginationState, createInitialPaginationState } from '../../core/models/pagination.model';
import { OrderView } from '../../models/order-view.model'; // Ensure this exists

export const orderFeatureKey = 'order';

export interface State {
    orders: Order[]; // For compatibility or details
    loading: boolean;
    error: any;

    // Pagination for Order List View
    pagination: PaginationState<OrderView>;
}

export const initialState: State = {
    orders: [],
    loading: false,
    error: null,

    pagination: createInitialPaginationState<OrderView>()
};

export const reducer = createReducer(
    initialState,

    // --- Legacy / Detail Actions ---
    on(OrderActions.loadOrders, state => ({
        ...state,
        loading: true
    })),
    on(OrderActions.loadOrdersSuccess, (state, { orders }) => ({
        ...state,
        loading: false,
        orders
    })),
    on(OrderActions.loadOrdersFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    })),
    // ... createOrder handlers if needed

    // --- Pagination Actions ---
    on(OrderActions.loadFirstPageOrders, (state) => ({
        ...state,
        pagination: {
            ...state.pagination,
            loading: true,
            error: null,
            currentPage: 0,
            items: [],
            hasMore: true
        }
    })),

    on(OrderActions.loadFirstPageOrdersSuccess, (state, { orders, totalElements, totalPages }) => ({
        ...state,
        pagination: {
            ...state.pagination,
            items: orders,
            totalItems: totalElements,
            // totalPages not in state
            hasMore: 0 < totalPages - 1,
            loading: false,
            error: null
        }
    })),

    on(OrderActions.loadFirstPageOrdersFailure, (state, { error }) => ({
        ...state,
        pagination: {
            ...state.pagination,
            loading: false,
            error
        }
    })),

    on(OrderActions.loadNextPageOrders, (state) => ({
        ...state,
        pagination: {
            ...state.pagination,
            loading: true,
            error: null
        }
    })),

    on(OrderActions.loadNextPageOrdersSuccess, (state, { orders }) => ({
        ...state,
        pagination: {
            ...state.pagination,
            items: [...state.pagination.items, ...orders],
            currentPage: state.pagination.currentPage + 1,
            hasMore: (state.pagination.currentPage + 1 + 1) * state.pagination.pageSize < state.pagination.totalItems,
            loading: false,
            error: null
        }
    })),

    on(OrderActions.loadNextPageOrdersFailure, (state, { error }) => ({
        ...state,
        pagination: {
            ...state.pagination,
            loading: false,
            error
        }
    })),

    on(OrderActions.resetOrderPagination, (state) => ({
        ...state,
        pagination: createInitialPaginationState<OrderView>()
    }))
);
