import { Injectable } from '@angular/core';
import { SyncErrorService } from './sync-error.service';
import { LoggerService } from './logger.service';
import { SyncResult } from '../../models/sync.model';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

@Injectable({
  providedIn: 'root'
})
export class CrashlyticsReporterService {

  constructor(
    private readonly syncErrorService: SyncErrorService,
    private readonly loggerService: LoggerService
  ) { }

  async reportSyncErrors(syncResult: SyncResult): Promise<void> {
    try {
      const errors = await this.syncErrorService.getSyncErrors();

      if (errors.length === 0) {
        return;
      }

      const summaryMessage = `Sync completed with ${errors.length} error(s)`;
      await this.loggerService.recordException(summaryMessage);
      await this.loggerService.recordException(errors.map(error => error.errorMessage).join('\n'));

      for (const error of errors) {
        await this.loggerService.log('ERROR: ' + JSON.stringify(error, null, 2));
        let errorDetail = `Entity: ${error.entityType} | ID: ${error.entityId} | Code: ${error.errorCode || 'N/A'} | Message: ${error.errorMessage || 'Unknown error'}`;

        if (error.entityType !== 'client' && error.requestData) {
          errorDetail += ` | Request: ${JSON.stringify(error.requestData)}`;
        }
        if (error.responseData) {
          errorDetail += ` | Response: ${JSON.stringify(error.responseData)}`;
        }

        await FirebaseCrashlytics.log({ message: errorDetail });
      }
    } catch (error) {
      console.error('Error reporting sync errors to Crashlytics:', error);
    }
  }
}
