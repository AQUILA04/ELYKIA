import { Injectable } from '@angular/core';

/**
 * While a 401 is closing the session, blocking error dialogs must not stack.
 * Cleared when the user starts a new sign-in.
 */
@Injectable({
  providedIn: 'root'
})
export class SessionExpiryState {
  private active = false;

  begin(): void {
    this.active = true;
  }

  end(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}
