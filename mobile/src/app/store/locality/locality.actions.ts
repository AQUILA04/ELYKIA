import { createAction, props } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';

export const loadLocalities = createAction('[Locality] Load Localities');

export const loadLocalitiesSuccess = createAction(
  '[Locality] Load Localities Success',
  props<{ localities: Locality[] }>()
);

export const loadLocalitiesFailure = createAction(
  '[Locality] Load Localities Failure',
  props<{ error: any }>()
);

export const addLocality = createAction(
  '[Locality] Add Locality',
  props<{ locality: Pick<Locality, 'name'> }>()
);

export const addLocalitySuccess = createAction(
  '[Locality] Add Locality Success',
  props<{ locality: Locality }>()
);

export const addLocalityFailure = createAction(
  '[Locality] Add Locality Failure',
  props<{ error: any }>()
);
