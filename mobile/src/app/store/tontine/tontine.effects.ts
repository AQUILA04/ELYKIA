import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, filter, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { concat, from, of } from 'rxjs';
import * as TontineActions from './tontine.actions';
import { TontineService } from '../../core/services/tontine.service';
import { OnlineListRefreshService } from '../../core/services/online-list-refresh.service';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../auth/auth.selectors';
import { selectTontineState } from './tontine.selectors';
import { Page } from '../../core/repositories/repository.interface';

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

    // Pagination Effects — SWR
    loadFirstPageTontineMembers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineMembers),
            withLatestFrom(this.store.select(selectAuthUser)),
            switchMap(([{ sessionId, filters }, user]) => {
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineMembersPaginated(sessionId, 0, 20, filters).pipe(
                    concatMap((localPage) => concat(
                        of(TontineActions.loadFirstPageTontineMembersSuccess({
                            members: localPage.content,
                            totalElements: localPage.totalElements,
                            totalPages: localPage.totalPages
                        })),
                        from(this.onlineListRefreshService.refreshTontineMembersPage(
                            sessionId,
                            commercialUsername,
                            0,
                            20,
                            filters
                        )).pipe(
                            filter((serverPage): serverPage is Page<any> => !!serverPage),
                            map((serverPage) => TontineActions.loadFirstPageTontineMembersSuccess({
                                members: serverPage.content,
                                totalElements: serverPage.totalElements,
                                totalPages: serverPage.totalPages
                            }))
                        )
                    )),
                    catchError(error => of(TontineActions.loadFirstPageTontineMembersFailure({ error: error.message })))
                );
            })
        )
    );

    loadNextPageTontineMembers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineMembers),
            withLatestFrom(this.store.select(selectTontineState), this.store.select(selectAuthUser)),
            switchMap(([{ sessionId, filters }, state, user]) => {
                const nextPage = state.memberPagination.currentPage + 1;
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineMembersPaginated(sessionId, nextPage, 20, filters).pipe(
                    tap(() => {
                        void this.onlineListRefreshService.refreshTontineMembersPage(
                            sessionId,
                            commercialUsername,
                            nextPage,
                            20,
                            filters
                        );
                    }),
                    map((localPage) => TontineActions.loadNextPageTontineMembersSuccess({
                        members: localPage.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineMembersFailure({ error: error.message })))
                );
            })
        )
    );

    loadFirstPageTontineCollections$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineCollections),
            withLatestFrom(this.store.select(selectAuthUser)),
            switchMap(([{ filters }, user]) => {
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineCollectionsPaginated(0, 20, filters).pipe(
                    concatMap((localPage) => concat(
                        of(TontineActions.loadFirstPageTontineCollectionsSuccess({
                            collections: localPage.content,
                            totalElements: localPage.totalElements,
                            totalPages: localPage.totalPages
                        })),
                        from(this.onlineListRefreshService.refreshTontineCollectionsPage(
                            commercialUsername,
                            0,
                            20,
                            filters
                        )).pipe(
                            filter((serverPage): serverPage is Page<any> => !!serverPage),
                            map((serverPage) => TontineActions.loadFirstPageTontineCollectionsSuccess({
                                collections: serverPage.content,
                                totalElements: serverPage.totalElements,
                                totalPages: serverPage.totalPages
                            }))
                        )
                    )),
                    catchError(error => of(TontineActions.loadFirstPageTontineCollectionsFailure({ error: error.message })))
                );
            })
        )
    );

    loadNextPageTontineCollections$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineCollections),
            withLatestFrom(this.store.select(selectTontineState), this.store.select(selectAuthUser)),
            switchMap(([{ filters }, state, user]) => {
                const nextPage = state.collectionPagination.currentPage + 1;
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineCollectionsPaginated(nextPage, 20, filters).pipe(
                    tap(() => {
                        void this.onlineListRefreshService.refreshTontineCollectionsPage(
                            commercialUsername,
                            nextPage,
                            20,
                            filters
                        );
                    }),
                    map((localPage) => TontineActions.loadNextPageTontineCollectionsSuccess({
                        collections: localPage.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineCollectionsFailure({ error: error.message })))
                );
            })
        )
    );

    loadFirstPageTontineDeliveries$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineDeliveries),
            withLatestFrom(this.store.select(selectAuthUser)),
            switchMap(([{ filters }, user]) => {
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineDeliveriesPaginated(0, 20, filters).pipe(
                    concatMap((localPage) => concat(
                        of(TontineActions.loadFirstPageTontineDeliveriesSuccess({
                            deliveries: localPage.content,
                            totalElements: localPage.totalElements,
                            totalPages: localPage.totalPages
                        })),
                        from(this.onlineListRefreshService.refreshTontineDeliveriesPage(
                            commercialUsername,
                            0,
                            20,
                            filters
                        )).pipe(
                            filter((serverPage): serverPage is Page<any> => !!serverPage),
                            map((serverPage) => TontineActions.loadFirstPageTontineDeliveriesSuccess({
                                deliveries: serverPage.content,
                                totalElements: serverPage.totalElements,
                                totalPages: serverPage.totalPages
                            }))
                        )
                    )),
                    catchError(error => of(TontineActions.loadFirstPageTontineDeliveriesFailure({ error: error.message })))
                );
            })
        )
    );

    loadNextPageTontineDeliveries$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineDeliveries),
            withLatestFrom(this.store.select(selectTontineState), this.store.select(selectAuthUser)),
            switchMap(([{ filters }, state, user]) => {
                const nextPage = state.deliveryPagination.currentPage + 1;
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineDeliveriesPaginated(nextPage, 20, filters).pipe(
                    tap(() => {
                        void this.onlineListRefreshService.refreshTontineDeliveriesPage(
                            commercialUsername,
                            nextPage,
                            20,
                            filters
                        );
                    }),
                    map((localPage) => TontineActions.loadNextPageTontineDeliveriesSuccess({
                        deliveries: localPage.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineDeliveriesFailure({ error: error.message })))
                );
            })
        )
    );

    loadFirstPageTontineStocks$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadFirstPageTontineStocks),
            withLatestFrom(this.store.select(selectAuthUser)),
            switchMap(([{ sessionId, filters }, user]) => {
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineStocksPaginated(sessionId, 0, 20, filters).pipe(
                    concatMap((localPage) => concat(
                        of(TontineActions.loadFirstPageTontineStocksSuccess({
                            stocks: localPage.content,
                            totalElements: localPage.totalElements,
                            totalPages: localPage.totalPages
                        })),
                        from(this.onlineListRefreshService.refreshTontineStocksPage(
                            sessionId,
                            commercialUsername,
                            0,
                            20,
                            filters
                        )).pipe(
                            filter((serverPage): serverPage is Page<any> => !!serverPage),
                            map((serverPage) => TontineActions.loadFirstPageTontineStocksSuccess({
                                stocks: serverPage.content,
                                totalElements: serverPage.totalElements,
                                totalPages: serverPage.totalPages
                            }))
                        )
                    )),
                    catchError(error => of(TontineActions.loadFirstPageTontineStocksFailure({ error: error.message })))
                );
            })
        )
    );

    loadNextPageTontineStocks$ = createEffect(() =>
        this.actions$.pipe(
            ofType(TontineActions.loadNextPageTontineStocks),
            withLatestFrom(this.store.select(selectTontineState), this.store.select(selectAuthUser)),
            switchMap(([{ sessionId, filters }, state, user]) => {
                const nextPage = state.stockPagination.currentPage + 1;
                const commercialUsername = user?.username || '';
                return this.tontineService.getTontineStocksPaginated(sessionId, nextPage, 20, filters).pipe(
                    tap(() => {
                        void this.onlineListRefreshService.refreshTontineStocksPage(
                            sessionId,
                            commercialUsername,
                            nextPage,
                            20,
                            filters
                        );
                    }),
                    map((localPage) => TontineActions.loadNextPageTontineStocksSuccess({
                        stocks: localPage.content
                    })),
                    catchError(error => of(TontineActions.loadNextPageTontineStocksFailure({ error: error.message })))
                );
            })
        )
    );

    constructor(
        private actions$: Actions,
        private tontineService: TontineService,
        private onlineListRefreshService: OnlineListRefreshService,
        private store: Store
    ) { }
}
