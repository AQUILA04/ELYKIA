import { createAction, props } from '@ngrx/store';

export const loadTontineSession = createAction(
    '[Tontine] Load Session'
);

export const loadTontineSessionSuccess = createAction(
    '[Tontine] Load Session Success',
    props<{ session: any }>()
);

export const loadTontineSessionFailure = createAction(
    '[Tontine] Load Session Failure',
    props<{ error: any }>()
);

export const loadTontineMembers = createAction(
    '[Tontine] Load Members',
    props<{ sessionId: string }>()
);

export const loadTontineMembersSuccess = createAction(
    '[Tontine] Load Members Success',
    props<{ members: any[] }>()
);

export const loadTontineMembersFailure = createAction(
    '[Tontine] Load Members Failure',
    props<{ error: any }>()
);

export const addTontineMember = createAction(
    '[Tontine] Add Member',
    props<{ member: any }>()
);

export const addTontineMemberSuccess = createAction(
    '[Tontine] Add Member Success',
    props<{ member: any }>()
);

export const addTontineMemberFailure = createAction(
    '[Tontine] Add Member Failure',
    props<{ error: any }>()
);

export const syncTontineData = createAction(
    '[Tontine] Sync Data'
);

export const syncTontineDataSuccess = createAction(
    '[Tontine] Sync Data Success'
);

export const syncTontineDataFailure = createAction(
    '[Tontine] Sync Data Failure',
    props<{ error: any }>()
);

export const loadTontineCollections = createAction(
    '[Tontine] Load Collections'
);

export const loadTontineCollectionsSuccess = createAction(
    '[Tontine] Load Collections Success',
    props<{ collections: any[] }>()
);

export const loadTontineCollectionsFailure = createAction(
    '[Tontine] Load Collections Failure',
    props<{ error: any }>()
);

// Pagination Actions for Members
export const loadFirstPageTontineMembers = createAction(
    '[Tontine] Load First Page Members',
    props<{ sessionId: string; filters?: { searchQuery?: string; deliveryStatus?: string; status?: string; quarter?: string; dateFilter?: any; isLocal?: boolean; isSync?: boolean } }>()
);

export const loadFirstPageTontineMembersSuccess = createAction(
    '[Tontine] Load First Page Members Success',
    props<{ members: any[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageTontineMembersFailure = createAction(
    '[Tontine] Load First Page Members Failure',
    props<{ error: string }>()
);

export const loadNextPageTontineMembers = createAction(
    '[Tontine] Load Next Page Members',
    props<{ sessionId: string; filters?: { searchQuery?: string; deliveryStatus?: string; status?: string; quarter?: string; dateFilter?: any; isLocal?: boolean; isSync?: boolean } }>()
);

export const loadNextPageTontineMembersSuccess = createAction(
    '[Tontine] Load Next Page Members Success',
    props<{ members: any[] }>()
);

export const loadNextPageTontineMembersFailure = createAction(
    '[Tontine] Load Next Page Members Failure',
    props<{ error: string }>()
);

export const resetTontineMemberPagination = createAction(
    '[Tontine] Reset Member Pagination'
);

// Pagination Actions for Collections
export const loadFirstPageTontineCollections = createAction(
    '[Tontine] Load First Page Collections',
    props<{ filters?: any }>()
);

export const loadFirstPageTontineCollectionsSuccess = createAction(
    '[Tontine] Load First Page Collections Success',
    props<{ collections: any[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageTontineCollectionsFailure = createAction(
    '[Tontine] Load First Page Collections Failure',
    props<{ error: string }>()
);

export const loadNextPageTontineCollections = createAction(
    '[Tontine] Load Next Page Collections',
    props<{ filters?: any }>()
);

export const loadNextPageTontineCollectionsSuccess = createAction(
    '[Tontine] Load Next Page Collections Success',
    props<{ collections: any[] }>()
);

export const loadNextPageTontineCollectionsFailure = createAction(
    '[Tontine] Load Next Page Collections Failure',
    props<{ error: string }>()
);

export const resetTontineCollectionPagination = createAction(
    '[Tontine] Reset Collection Pagination'
);

// Pagination Actions for Deliveries
export const loadFirstPageTontineDeliveries = createAction(
    '[Tontine] Load First Page Deliveries',
    props<{ filters?: any }>()
);

export const loadFirstPageTontineDeliveriesSuccess = createAction(
    '[Tontine] Load First Page Deliveries Success',
    props<{ deliveries: any[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageTontineDeliveriesFailure = createAction(
    '[Tontine] Load First Page Deliveries Failure',
    props<{ error: string }>()
);

export const loadNextPageTontineDeliveries = createAction(
    '[Tontine] Load Next Page Deliveries',
    props<{ filters?: any }>()
);

export const loadNextPageTontineDeliveriesSuccess = createAction(
    '[Tontine] Load Next Page Deliveries Success',
    props<{ deliveries: any[] }>()
);

export const loadNextPageTontineDeliveriesFailure = createAction(
    '[Tontine] Load Next Page Deliveries Failure',
    props<{ error: string }>()
);

export const resetTontineDeliveryPagination = createAction(
    '[Tontine] Reset Delivery Pagination'
);

// Pagination Actions for Stocks
export const loadFirstPageTontineStocks = createAction(
    '[Tontine] Load First Page Stocks',
    props<{ sessionId: string; filters?: { searchQuery?: string } }>()
);

export const loadFirstPageTontineStocksSuccess = createAction(
    '[Tontine] Load First Page Stocks Success',
    props<{ stocks: any[]; totalElements: number; totalPages: number }>()
);

export const loadFirstPageTontineStocksFailure = createAction(
    '[Tontine] Load First Page Stocks Failure',
    props<{ error: string }>()
);

export const loadNextPageTontineStocks = createAction(
    '[Tontine] Load Next Page Stocks',
    props<{ sessionId: string; filters?: { searchQuery?: string } }>()
);

export const loadNextPageTontineStocksSuccess = createAction(
    '[Tontine] Load Next Page Stocks Success',
    props<{ stocks: any[] }>()
);

export const loadNextPageTontineStocksFailure = createAction(
    '[Tontine] Load Next Page Stocks Failure',
    props<{ error: string }>()
);

export const resetTontineStockPagination = createAction(
    '[Tontine] Reset Stock Pagination'
);
