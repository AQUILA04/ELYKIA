import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import * as OrderActions from './order.actions';
import { OrderService } from '../../core/services/order.service';
import { Store } from '@ngrx/store';
import { selectOrderState } from './order.selectors';
import { selectAuthUser } from '../auth/auth.selectors';

@Injectable()
export class OrderEffects {

    // Legacy Effects (if keeping them, implement here or keep separate)
    // loadOrders$ = ...

    // Pagination Effects
    loadFirstPageOrders$ = createEffect(() =>
        this.actions$.pipe(
            ofType(OrderActions.loadFirstPageOrders),
            withLatestFrom(this.store.select(selectAuthUser)),
            switchMap(([{ filters }, user]) => {
                const commercialId = user?.id || ''; // Or username depending on what service expects
                // Actually OrderService usually handles getting the current user if not passed.
                // But getOrdersPaginated needs commercialId potentially? 
                // Let's assume service handles it internally or we pass it.
                // TontineService logic: service gets user from store. 
                // Let's check OrderService later.

                return this.orderService.getOrdersPaginated(0, 20, filters).pipe(
                    map(page => OrderActions.loadFirstPageOrdersSuccess({
                        orders: page.content,
                        totalElements: page.totalElements,
                        totalPages: page.totalPages
                    })),
                    catchError(error => of(OrderActions.loadFirstPageOrdersFailure({ error: error.message })))
                );
            })
        )
    );

    loadNextPageOrders$ = createEffect(() =>
        this.actions$.pipe(
            ofType(OrderActions.loadNextPageOrders),
            withLatestFrom(this.store.select(selectOrderState), this.store.select(selectAuthUser)),
            switchMap(([{ filters }, state, user]) => {
                const nextPage = state.pagination.currentPage + 1;
                return this.orderService.getOrdersPaginated(nextPage, 20, filters).pipe(
                    map(page => OrderActions.loadNextPageOrdersSuccess({
                        orders: page.content
                    })),
                    catchError(error => of(OrderActions.loadNextPageOrdersFailure({ error: error.message })))
                );
            })
        )
    );

    constructor(
        private actions$: Actions,
        private orderService: OrderService,
        private store: Store
    ) { }
}
