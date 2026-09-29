import { ErrorHandler, Injectable, inject } from '@angular/core';
import { UserJournalService } from './user-journal.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly journal = inject(UserJournalService);
  private rejectionHookInstalled = false;

  constructor() {
    this.installUnhandledRejectionHook();
  }

  handleError(error: unknown): void {
    const message = this.formatError(error);
    console.error(error);
    void this.journal.recordException(message);
    this.journal.track('APP_ERROR', 'ERROR', { message: message.slice(0, 500) });
  }

  private installUnhandledRejectionHook(): void {
    if (this.rejectionHookInstalled || typeof window === 'undefined') {
      return;
    }
    this.rejectionHookInstalled = true;
    window.addEventListener('unhandledrejection', (event) => {
      const message = this.formatError(event.reason);
      void this.journal.recordException(`unhandledrejection: ${message}`);
      this.journal.track('UNHANDLED_REJECTION', 'ERROR', {
        message: message.slice(0, 500),
      });
    });
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
