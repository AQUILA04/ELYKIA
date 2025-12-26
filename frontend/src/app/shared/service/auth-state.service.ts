// auth-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly AUTH_KEY = 'elykia_auth';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.checkInitialAuth());
  private userSubject = new BehaviorSubject<any>(this.getStoredUser());

  constructor() {
    // Écouter les changements de stockage entre onglets
    window.addEventListener('storage', (event) => {
      if (event.key === this.AUTH_KEY) {
        this.checkAuthState();
      }
    });
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentUser$(): Observable<any> {
    return this.userSubject.asObservable();
  }

  login(user: any, token: string): void {
    const authData = { user, token, timestamp: Date.now() };
    sessionStorage.setItem(this.AUTH_KEY, JSON.stringify(authData));
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(authData)); // Pour la synchronisation entre onglets
    this.isAuthenticatedSubject.next(true);
    this.userSubject.next(user);
  }

  logout(): void {
    sessionStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem(this.AUTH_KEY);
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
  }

  getToken(): string | null {
    const authData = this.getAuthData();
    return authData?.token || null;
  }

  getUser(): any {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private checkInitialAuth(): boolean {
    return !!this.getAuthData();
  }

  private getAuthData(): any {
    const authJson = sessionStorage.getItem(this.AUTH_KEY) || localStorage.getItem(this.AUTH_KEY);
    if (authJson) {
      try {
        return JSON.parse(authJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private getStoredUser(): any {
    const authData = this.getAuthData();
    return authData?.user || null;
  }

  private checkAuthState(): void {
    const authData = this.getAuthData();
    const isAuthenticated = !!authData;

    if (isAuthenticated !== this.isAuthenticatedSubject.value) {
      this.isAuthenticatedSubject.next(isAuthenticated);
      this.userSubject.next(authData?.user || null);
    }
  }
}
