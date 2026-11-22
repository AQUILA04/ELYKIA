import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { LoggerService } from './logger.service';
import { toUserErrorMessage } from '../utils/user-error-message.util';
import {
  OnlineFirstWriteResult,
  OnlineWriteError,
  WriteErrorKind,
  WritePersistenceMode
} from './online-first-write.types';

export interface OnlineFirstWriteOptions<T> {
  entityLabel: string;
  saveOffline: () => Promise<T>;
  saveOnline: () => Promise<T>;
  forceOffline?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnlineFirstWriteCoordinator {
  constructor(
    private readonly connectivityService: ConnectivityService,
    private readonly hybridSyncPreferenceService: HybridSyncPreferenceService,
    private readonly log: LoggerService
  ) {}

  async executeWrite<T>(options: OnlineFirstWriteOptions<T>): Promise<OnlineFirstWriteResult<T>> {
    const hybridEnabled = await this.hybridSyncPreferenceService.isHybridSyncEnabled();
    const shouldTryOnline = hybridEnabled && !options.forceOffline;

    if (shouldTryOnline) {
      const reachable = await this.connectivityService.checkBackendReachable();
      if (reachable) {
        const startedAt = Date.now();
        try {
          const data = await options.saveOnline();
          void this.log.log(
            `[OnlineFirstWrite] ${options.entityLabel} saved online in ${Date.now() - startedAt}ms`
          );
          return { data, mode: 'online' };
        } catch (error) {
          if (this.isBusinessError(error)) {
            throw new OnlineWriteError(
              WriteErrorKind.BUSINESS,
              this.extractErrorMessage(error),
              error instanceof HttpErrorResponse ? error.status : (error as OnlineWriteError).status
            );
          }
          void this.log.log(
            `[OnlineFirstWrite] ${options.entityLabel} online failed (network), fallback offline: ${this.extractErrorMessage(error)}`
          );
        }
      }
    }

    const data = await options.saveOffline();
    void this.log.log(`[OnlineFirstWrite] ${options.entityLabel} saved offline`);
    return { data, mode: 'offline' as WritePersistenceMode };
  }

  isBusinessError(error: unknown): boolean {
    if (error instanceof OnlineWriteError) {
      return error.kind === WriteErrorKind.BUSINESS;
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return false;
      }
      return error.status >= 400 && error.status < 500;
    }
    return false;
  }

  extractErrorMessage(error: unknown): string {
    if (error instanceof OnlineWriteError) {
      return error.message;
    }
    // Message du backend (`Response.message`), jamais le texte technique d'Angular.
    return toUserErrorMessage(error, 'Une erreur est survenue lors de l\'enregistrement.');
  }
}
