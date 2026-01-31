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
  error: null
};

export const commercialStockReducer = createReducer(
  initialState,
  on(CommercialStockActions.loadCommercialStock, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(CommercialStockActions.loadCommercialStockSuccess, (state, { stockItems }) => ({
    ...state,
    stockItems,
    loading: false
  })),
  on(CommercialStockActions.loadCommercialStockFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(CommercialStockActions.syncCommercialStock, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(CommercialStockActions.syncCommercialStockSuccess, (state, { stockItems }) => ({
    ...state,
    stockItems,
    loading: false
  })),
  on(CommercialStockActions.syncCommercialStockFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(CommercialStockActions.updateStockQuantity, (state, { articleId, quantityChange }) => {
      const updatedItems = state.stockItems.map(item => {
          if (item.articleId === articleId) {
              const newQuantityRemaining = item.quantityRemaining + quantityChange;
              let newQuantitySold = item.quantitySold || 0;

              // Si la quantité diminue (vente), on augmente la quantité vendue
              if (quantityChange < 0) {
                  newQuantitySold += Math.abs(quantityChange);
              }

              return {
                  ...item,
                  quantityRemaining: newQuantityRemaining,
                  quantitySold: newQuantitySold
              };
          }
          return item;
      });
      return { ...state, stockItems: updatedItems };
  })
);
