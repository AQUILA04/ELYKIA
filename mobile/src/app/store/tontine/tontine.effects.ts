import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as TontineActions from './tontine.actions';
import { TontineService } from '../../core/services/tontine.service';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../auth/auth.selectors';
import { withLatestFrom } from 'rxjs/operators';
import { selectTontineState } from './tontine.selectors';
import { TontineCollectionRepositoryExtensions } from '../../core/repositories/tontine-collection.repository.extensions';
import { from } from 'rxjs';

@Injectable()
export class TontineEffects {

    loadSession$ = createEffect(() => this.actions$.pipe(
        ofType(TontineActions.loadTontineSession),
        mergeMap(() => this.tontineService.getSession()
            .pipe(
                map(session => TontineActions.loadTontineSessionSuccess({ session })),
                catchError(error => of(TontineActions.loadTontineSessionFailure({ error })))
            ))
    ));

    loadMembers$ = createEffect(() => this.actions$.pipe(
        ofType(TontineActions.loadTontineMembers),
        mergeMap(action => this.tontineService.getMembers(action.sessionId)
            .pipe(
                map(members => TontineActions.loadTontineMembersSuccess({ members })),
                catchError(error => of(TontineActions.loadTontineMembersFailure({ error })))
            ))
    ));

    loadCollections$ = createEffect(() => this.actions$.pipe(
        ofType(TontineActions.loadTontineCollections),
        withLatestFrom(this.store.select(selectAuthUser)),
        mergeMap(([action, user]) => {
            const username = user?.username;
            if (!username) {
                return of(TontineActions.loadTontineCollectionsFailure({ error: 'User not authenticated' }));
            }
            return this.tontineService.getCollections(username)
                .pipe(
                    map(collections => TontineActions.loadTontineCollectionsSuccess({ collections })),
                    catchError(error => of(TontineActions.loadTontineCollectionsFailure({ error })))
                );
        })
    ));

    // Pagination Effects
    loadFirstPageTontineMembers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineMembers),
            switchMap(({ sessionId, filters }) =>
                this.tontineService.getTontineMembersPaginated(sessionId, 0, 20, filters).pipe(
                    map(page => TontineActions.loadFirstPageTontineMembersSuccess({
                        members: page.content,
                        totalElements: page.totalElements,
                        totalPages: page.totalPages
                    })),
                    catchError(error => of(TontineActions.loadFirstPageTontineMembersFailure({ error: error.message })))
                )
            )
        )
    );

    loadNextPageTontineMembers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineMembers),
            withLatestFrom(this.store.select(selectTontineState)),
            switchMap(([{ sessionId, filters }, state]) => {
                const nextPage = state.memberPagination.currentPage + 1;
                return this.tontineService.getTontineMembersPaginated(sessionId, nextPage, 20, filters).pipe(
                    map(page => TontineActions.loadNextPageTontineMembersSuccess({
                        members: page.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineMembersFailure({ error: error.message })))
                );
            })
        )
    );

    // Collection Pagination Effects
    loadFirstPageTontineCollections$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineCollections),
            switchMap(({ filters }) =>
                this.tontineService.getTontineCollectionsPaginated(0, 20, filters).pipe(
                    map(page => TontineActions.loadFirstPageTontineCollectionsSuccess({
                        collections: page.content,
                        totalElements: page.totalElements,
                        totalPages: page.totalPages
                    })),
                    catchError(error => of(TontineActions.loadFirstPageTontineCollectionsFailure({ error: error.message })))
                )
            )
        )
    );

    loadNextPageTontineCollections$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineCollections),
            withLatestFrom(this.store.select(selectTontineState)),
            switchMap(([{ filters }, state]) => {
                const nextPage = state.collectionPagination.currentPage + 1;
                return this.tontineService.getTontineCollectionsPaginated(nextPage, 20, filters).pipe(
                    map(page => TontineActions.loadNextPageTontineCollectionsSuccess({
                        collections: page.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineCollectionsFailure({ error: error.message })))
                );
            })
        )
    );

    // Delivery Pagination Effects
    loadFirstPageTontineDeliveries$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineDeliveries),
            switchMap(({ filters }) =>
                this.tontineService.getTontineDeliveriesPaginated(0, 20, filters).pipe(
                    map(page => TontineActions.loadFirstPageTontineDeliveriesSuccess({
                        deliveries: page.content,
                        totalElements: page.totalElements,
                        totalPages: page.totalPages
                    })),
                    catchError(error => of(TontineActions.loadFirstPageTontineDeliveriesFailure({ error: error.message })))
                )
            )
        )
    );

    loadNextPageTontineDeliveries$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineDeliveries),
            withLatestFrom(this.store.select(selectTontineState)),
            switchMap(([{ filters }, state]) => {
                const nextPage = state.deliveryPagination.currentPage + 1;
                return this.tontineService.getTontineDeliveriesPaginated(nextPage, 20, filters).pipe(
                    map(page => TontineActions.loadNextPageTontineDeliveriesSuccess({
                        deliveries: page.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineDeliveriesFailure({ error: error.message })))
                );
            })
        )
    );

    // Stock Pagination Effects
    loadFirstPageTontineStocks$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineStocks),
            switchMap(({ sessionId, filters }) =>
                this.tontineService.getTontineStocksPaginated(sessionId, 0, 20, filters).pipe(
                    map(page => TontineActions.loadFirstPageTontineStocksSuccess({
                        stocks: page.content,
                        totalElements: page.totalElements,
                        totalPages: page.totalPages
                    })),
                    catchError(error => of(TontineActions.loadFirstPageTontineStocksFailure({ error: error.message })))
                )
            )
        )
    );

    loadNextPageTontineStocks$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineStocks),
            withLatestFrom(this.store.select(selectTontineState)),
            switchMap(([{ sessionId, filters }, state]) => {
                const nextPage = state.stockPagination.currentPage + 1;
                return this.tontineService.getTontineStocksPaginated(sessionId, nextPage, 20, filters).pipe(
                    map(page => TontineActions.loadNextPageTontineStocksSuccess({
                        stocks: page.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineStocksFailure({ error: error.message })))
                );
            })
        )
    );

    constructor(
        private actions$: Actions,
        private tontineService: TontineService,
        private store: Store,
        private tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions
    ) { }
}
