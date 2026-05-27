import { InjectionToken } from '@angular/core';
import { LocalDataCleanupHandler } from './handlers/local-data-cleanup-handler.interface';

export const LOCAL_DATA_CLEANUP_HANDLERS = new InjectionToken<LocalDataCleanupHandler[]>(
  'LOCAL_DATA_CLEANUP_HANDLERS'
);
