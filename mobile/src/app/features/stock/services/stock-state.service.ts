import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Operational context type for the stock module.
 * 'STANDARD' represents standard stock operations.
 * 'TONTINE' represents tontine-based stock operations.
 */
export type OperationalContext = 'STANDARD' | 'TONTINE';

/**
 * StockStateService manages the active operational context (Standard vs Tontine)
 * for the stock module. It follows the Container/Presenter pattern:
 * the container (StockDashboard) owns this state and exposes it downward to
 * presenter components via @Input() bindings.
 */
@Injectable({
  providedIn: 'root'
})
export class StockStateService {
  private contextSubject = new BehaviorSubject<OperationalContext>('STANDARD');

  /**
   * Observable stream of the current operational context.
   * Exposed as Observable (not BehaviorSubject) to enforce encapsulation.
   */
  readonly context$: Observable<OperationalContext> = this.contextSubject.asObservable();

  /**
   * Updates the active operational context.
   * @param context The new context to switch to ('STANDARD' | 'TONTINE').
   */
  setContext(context: OperationalContext): void {
    this.contextSubject.next(context);
  }
}
