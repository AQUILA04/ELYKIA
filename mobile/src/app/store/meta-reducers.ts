import { ActionReducer, MetaReducer } from '@ngrx/store';
import { logout } from './auth/auth.actions';
import { resetAppData } from './app.actions';
import { AppState } from './app.state';

// Helper function to create the new state
function resetUserSpecificState(state: AppState): AppState {
  // Create a new state object, carrying over the slices to preserve
  const newState: AppState = {
    ...state, // Start with the old state
    // Reset user-specific slices to their initial (undefined) state
    // NgRx will then re-initialize them using their reducers.
    auth: undefined, // Auth IS reset on logout
    client: undefined,
    commercial: undefined,
    account: undefined,
    recovery: undefined,
    transaction: undefined,
    distribution: undefined,
    stockOutput: undefined,
    sync: undefined,
    healthCheck: undefined,
    // article and locality are intentionally omitted to preserve their state (as per original code)
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

// Helper to reset data ONLY (preserving auth)
function resetDataStatePreservingAuth(state: AppState): AppState {
  const newState: AppState = {
    ...state,
    client: undefined,
    // commercial: undefined, // Keep commercial info if needed? usually tied to auth but data service re-fetches it. 
    // Let's reset everything except auth.
    commercial: undefined,
    account: undefined,
    recovery: undefined,
    transaction: undefined,
    distribution: undefined,
    stockOutput: undefined,
    sync: undefined,
    healthCheck: undefined,
    // strategies for article/locality might differ, but let's keep them if they are "static" data
    // Original logout logic preserved them. Let's preserve them here too for consistency, 
    // OR reset them if "vider la memoire" implies everything.
    // The user said "toutes les listes chargées". Client, distributions, accounts are the main ones.
    // Let's stick to the pattern: reset what logout resets, BUT keep auth.
  };

  // Ensure auth is preserved
  if (state.auth) {
    newState.auth = state.auth;
  }

  // Preserve static data as per original logout logic
  if (state.article) {
    newState.article = state.article;
  }
  if (state.locality) {
    newState.locality = state.locality;
  }

  return newState;
}

export function logoutResetState(reducer: ActionReducer<any>): ActionReducer<any> {
  return function (state, action) {
    if (action.type === logout.type) {
      // When logout action is dispatched, reset the specific parts of the state
      const newState = resetUserSpecificState(state as AppState);
      return reducer(newState, action);
    }

    if (action.type === resetAppData.type) {
      // Reset data but keep auth
      const newState = resetDataStatePreservingAuth(state as AppState);
      return reducer(newState, action);
    }

    // For all other actions, just pass them through to the original reducer
    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<any>[] = [logoutResetState];
