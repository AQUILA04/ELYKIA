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



    constructor(
        private actions$: Actions,
        private tontineService: TontineService,
        private store: Store,
        private tontineCollectionRepositoryExtensions: TontineCollectionRepositoryExtensions
    ) { }
}
