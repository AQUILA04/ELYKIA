import { ActionReducer, MetaReducer } from '@ngrx/store';
import { logout } from './auth/auth.actions';
import { AppState } from './app.state'; // You might need to create this interface

// Helper function to create the new state
function resetUserSpecificState(state: AppState): AppState {
  // Create a new state object, carrying over the slices to preserve
  const newState: AppState = {
    ...state, // Start with the old state
    // Reset user-specific slices to their initial (undefined) state
    // NgRx will then re-initialize them using their reducers.
    auth: undefined,
    client: undefined,
    commercial: undefined,
    account: undefined,
    recovery: undefined,
    transaction: undefined,
    distribution: undefined,
    stockOutput: undefined,
    sync: undefined,
    healthCheck: undefined,
    // article and locality are intentionally omitted to preserve their state
  };

  // Explicitly carry over the states to be preserved if they exist
  if (state.article) {
    newState.article = state.article;
  }
  if (state.locality) {
    newState.locality = state.locality;
  }

  return newState;
}

export function logoutResetState(reducer: ActionReducer<any>): ActionReducer<any> {
  return function(state, action) {
    if (action.type === logout.type) {
      // When logout action is dispatched, reset the specific parts of the state
      const newState = resetUserSpecificState(state as AppState);
      return reducer(newState, action);
    }
    // For all other actions, just pass them through to the original reducer
    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<any>[] = [logoutResetState];
