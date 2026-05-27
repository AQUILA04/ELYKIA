import { Provider } from '@angular/core';
import { LOCAL_DATA_CLEANUP_HANDLERS } from './local-data-cleanup.tokens';
import { DistributionLocalCleanupHandler } from './handlers/distribution-local-cleanup.handler';

/**
 * Enregistrer ici chaque handler (multi: true).
 * Ex. RecoveryLocalCleanupHandler, TontineMemberLocalCleanupHandler, …
 */
export const LOCAL_DATA_CLEANUP_PROVIDERS: Provider[] = [
  {
    provide: LOCAL_DATA_CLEANUP_HANDLERS,
    useExisting: DistributionLocalCleanupHandler,
    multi: true
  }
];
