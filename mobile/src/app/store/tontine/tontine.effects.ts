import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as TontineActions from './tontine.actions';
import { TontineService } from '../../core/services/tontine.service';

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
        mergeMap(() => this.tontineService.getCollections()
            .pipe(
                map(collections => TontineActions.loadTontineCollectionsSuccess({ collections })),
                catchError(error => of(TontineActions.loadTontineCollectionsFailure({ error })))
            ))
    ));

    constructor(
        private actions$: Actions,
        private tontineService: TontineService
    ) { }
}
