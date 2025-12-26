import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InitializationStateService {
  private isInitializing = false;
  private isComplete = false;
  private capturedUser: any = null;

  // Méthode pour capturer l'utilisateur au moment du login
  public setUser(user: any): void {
    this.capturedUser = user;
  }

  public getUser(): any {
    return this.capturedUser;
  }

  public start(): void {
    this.isInitializing = true;
  }

  public complete(): void {
    this.isInitializing = false;
    this.isComplete = true;
  }

  public fail(): void {
    this.isInitializing = false;
    this.isComplete = false;
  }

  public hasStarted(): boolean {
    return this.isInitializing || this.isComplete;
  }
}
