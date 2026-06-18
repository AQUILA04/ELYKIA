import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CustomerSession } from '../models/customer-auth.model';

const SESSION_KEY = 'elykia_customer_session';

/**
 * Gestion de la session client (stockage local sécurisé).
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
    const s = this.currentSession;
    if (!s) return false;
    return s.isAuthenticated && new Date(s.expiresAt) > new Date();
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
      return raw ? (JSON.parse(raw) as CustomerSession) : null;
    } catch {
      return null;
    }
  }
}
