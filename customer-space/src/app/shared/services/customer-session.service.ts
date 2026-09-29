import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { CustomerSession } from '../models/customer-auth.model';

const SESSION_KEY = 'elykia_customer_session';

/**
 * Gestion de la session client (stockage local sécurisé).
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerSessionService {
  private readonly journal = inject(UserJournalService);
  private sessionSubject = new BehaviorSubject<CustomerSession | null>(this.loadSession());

  get session$(): Observable<CustomerSession | null> {
    return this.sessionSubject.asObservable();
  }

  get currentSession(): CustomerSession | null {
    return this.sessionSubject.getValue();
  }

  get isAuthenticated(): boolean {
    const s = this.currentSession;
    if (!s) return false;
    return s.isAuthenticated && new Date(s.expiresAt) > new Date();
  }

  saveSession(session: CustomerSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
    void this.journal.bindUser(session.clientId, session.phone ?? null);
    this.journal.track('LOGIN_SUCCESS', 'AUTH', {
      clientId: session.clientId,
      activationStatus: session.activationStatus ?? null,
    });
  }

  clearSession(): void {
    const hadSession = !!this.currentSession;
    localStorage.removeItem(SESSION_KEY);
    this.sessionSubject.next(null);
    if (hadSession) {
      this.journal.track('LOGOUT', 'AUTH');
      void this.journal.unbindUser();
      void this.journal.flush();
    }
  }

  private loadSession(): CustomerSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as CustomerSession) : null;
    } catch {
      return null;
    }
  }
}
