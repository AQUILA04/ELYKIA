import { Inject, Injectable, Optional } from '@angular/core';
import { LocalDataCleanupHandler } from './handlers/local-data-cleanup-handler.interface';
import { LOCAL_DATA_CLEANUP_HANDLERS } from './local-data-cleanup.tokens';

@Injectable({ providedIn: 'root' })
export class LocalDataCleanupRegistryService {
  private readonly handlersByType = new Map<string, LocalDataCleanupHandler>();

  constructor(
    @Optional() @Inject(LOCAL_DATA_CLEANUP_HANDLERS) handlers: LocalDataCleanupHandler[] | null
  ) {
    (handlers ?? []).forEach(handler => this.handlersByType.set(handler.entityType, handler));
  }

  getHandlers(): LocalDataCleanupHandler[] {
    return Array.from(this.handlersByType.values());
  }

  getHandler(entityType: string): LocalDataCleanupHandler | undefined {
    return this.handlersByType.get(entityType);
  }
}
