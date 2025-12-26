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
