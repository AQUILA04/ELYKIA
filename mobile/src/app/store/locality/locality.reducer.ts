import { createReducer, on } from '@ngrx/store';
import { Locality } from 'src/app/models/locality.model';
import * as LocalityActions from './locality.actions';

export interface LocalityState {
  localities: Locality[];
  loading: boolean;
  error: any;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
}

export const initialState: LocalityState = {
  localities: [],
  loading: false,
  error: null,
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasMore: false,
};

export const localityReducer = createReducer(
  initialState,
  on(LocalityActions.loadFirstPage, (state, { pageSize }) => ({
    ...state,
    loading: true,
    page: 0,
    size: pageSize || 20,
    localities: [], // Reset list
    error: null,
  })),
  on(LocalityActions.loadNextPage, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(LocalityActions.loadLocalitiesSuccess, (state, { page }) => {
    return {
      ...state,
      localities: page.page === 0 ? page.content : [...state.localities, ...page.content],
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      page: page.page,
      size: page.size,
      hasMore: (page.page + 1) < page.totalPages,
      loading: false,
    };
  }),
  on(LocalityActions.addLocality, (state) => ({
    ...state,
    loading: true,
  })),
  on(LocalityActions.addLocalitySuccess, (state, { locality }) => ({
    ...state,
    localities: [locality, ...state.localities],
    loading: false,
  })),
  on(LocalityActions.addLocalityFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
