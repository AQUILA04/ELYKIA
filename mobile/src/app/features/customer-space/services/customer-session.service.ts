import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomerSession } from '../models/customer-auth.model';

const SESSION_KEY = 'elykia_customer_session';

/**
 * Gestion de la session client (stockage local sécurisé).
 * Distinct de la session commerciale pour éviter tout conflit de rôle.
 *
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerSessionService {
  private sessionSubject = new BehaviorSubject<CustomerSession | null>(this.loadSession());

  get session$(): Observable<CustomerSession | null> {
    return this.sessionSubject.asObservable();
  }

  get currentSession(): CustomerSession | null {
    return this.sessionSubject.getValue();
  }

  get isAuthenticated(): boolean {
    const session = this.currentSession;
    if (!session) return false;
    return session.isAuthenticated && new Date(session.expiresAt) > new Date();
  }

  saveSession(session: CustomerSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    this.sessionSubject.next(null);
  }

  private loadSession(): CustomerSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
