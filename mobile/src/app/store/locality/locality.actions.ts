import { createAction, props } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';

import { LocalityRepositoryFilters } from 'src/app/core/repositories/locality.repository.extensions';
import { Page } from 'src/app/core/repositories/repository.interface';

export const loadFirstPage = createAction(
  '[Locality] Load First Page',
  props<{ pageSize?: number, filters?: LocalityRepositoryFilters }>()
);

export const loadNextPage = createAction(
  '[Locality] Load Next Page',
  props<{ filters?: LocalityRepositoryFilters }>()
);

export const loadLocalitiesSuccess = createAction(
  '[Locality] Load Localities Success',
  props<{ page: Page<Locality> }>()
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
