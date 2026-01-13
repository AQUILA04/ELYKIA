import { createReducer, on } from '@ngrx/store';
import * as CommercialStockActions from './commercial-stock.actions';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';

export interface CommercialStockState {
  stockItems: CommercialStockItem[];
  loading: boolean;
  error: any;
}

export const initialState: CommercialStockState = {
  stockItems: [],
  loading: false,
  error: null,
};

export const commercialStockReducer = createReducer(
  initialState,
  on(CommercialStockActions.loadCommercialStock, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(CommercialStockActions.loadCommercialStockSuccess, (state, { stockItems }) => ({
    ...state,
    stockItems,
    loading: false,
    error: null,
  })),
  on(CommercialStockActions.loadCommercialStockFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(CommercialStockActions.updateStockQuantitySuccess, (state, { articleId, newQuantity }) => ({
    ...state,
    stockItems: state.stockItems.map(item => 
      item.articleId === articleId 
        ? { ...item, quantityRemaining: newQuantity }
        : item
    ),
  })),
  on(CommercialStockActions.reduceStockQuantitySuccess, (state, { articles }) => ({
    ...state,
    stockItems: state.stockItems.map(item => {
      const articleUpdate = articles.find(a => a.articleId === item.articleId);
      return articleUpdate 
        ? { ...item, quantityRemaining: item.quantityRemaining - articleUpdate.quantity }
        : item;
    }),
  }))
);