import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Preferences } from '@capacitor/preferences';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { AuthResponse, User, LoginRequest } from '../../models/auth.model';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { LoggerService } from './logger.service';
import { HealthCheckService } from './health-check.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';
import * as AuthActions from '../../store/auth/auth.actions';
import { Storage } from '@ionic/storage-angular';
import { MemoryManagementService } from './memory-management.service';
import { InitializationValidationService } from './initialization-validation.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;
  private _isAuthenticated = false;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private log: LoggerService,
    private healthCheckService: HealthCheckService,
    private store: Store<AppState>,
    private storage: Storage,
    private memoryManagementService: MemoryManagementService,
    private initValidationService: InitializationValidationService
  ) {
    this.loadUserFromPreferences();
  }

  private async loadUserFromPreferences() {
    const { value } = await Preferences.get({ key: 'currentUser' });
    if (value) {
      const user = JSON.parse(value);
      this._user = user;
      this._isAuthenticated = true;
      // Dispatch login success to update the store
      this.store.dispatch(AuthActions.loginSuccess({ user }));
    }
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get currentUser(): User | null {
    return this._user;
  }

  login(request: LoginRequest): Observable<boolean> {
    this.log.log('=== LOGIN PROCESS STARTED ===');
    this.log.log('Login attempt for: ' + request.username);
    this.log.log('Environment API URL: ' + environment.apiUrl);

    // Lancer le test réseau détaillé
    //this.healthCheckService.testNetworkConfig();

    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        this.log.log(`Health check result: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

        if (isOnline) {
          this.log.log('Backend is online, attempting API login.');
          return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/signin`, request).pipe(
            switchMap(response => from(this.processAuthResponse(response, request.password))),
            tap(() => {
              this._isAuthenticated = true;
              this.log.log('Online login successful.');
            }),
            catchError(error => {
              this.log.log('=== API LOGIN FAILED ===');
              this.log.log('API login error: ' + JSON.stringify(error, null, 2));
              this.log.log('Falling back to offline authentication...');
              return from(this.authenticateOffline(request.username, request.password));
            })
          );
        } else {
          this.log.log('Backend is offline, attempting offline login.');
          return from(this.authenticateOffline(request.username, request.password));
        }
      }),
      catchError(err => {
        this.log.log('=== LOGIN PROCESS FAILED ===');
        this.log.log('Complete login failure: ' + JSON.stringify(err, null, 2));
        throw new Error(err.message || 'Une erreur est survenue lors de la connexion.');
      })
    );
  }

  async logout(): Promise<void> {
    this._user = null;
    this._isAuthenticated = false;
    await Preferences.remove({ key: 'currentUser' });
    await this.storage.remove('initialization_complete');
    await this.memoryManagementService.clearMemoryCache();
    this.log.log('User logged out and local state reset.');
  }

  private async processAuthResponse(response: AuthResponse, passwordPlain: string): Promise<boolean> {
    const user: User = {
      id: response.id,
      username: response.username,
      email: response.email,
      roles: response.roles,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      passwordHash: this.hashPassword(passwordPlain) // Store hashed password
    };
    this._user = user;
    await this.saveUserLocally(user);
    // Dispatch login success to update the store
    this.store.dispatch(AuthActions.loginSuccess({ user }));
    return true;
  }

  private async authenticateOffline(username: string, passwordPlain: string): Promise<boolean> {
    // Vérifier si l'initialisation est complète pour aujourd'hui
    const isInitComplete = await this.initValidationService.isInitializationCompleteForToday();

    if (!isInitComplete) {
      console.warn('Offline login blocked: Initialization not complete for today');
      await this.log.log('Offline login blocked: Initialization not complete for today');
      throw new Error(
        'Initialisation incomplète pour aujourd\'hui.\n\n' +
        'Veuillez vous connecter au réseau de l\'entreprise pour initialiser vos données avant de travailler en mode hors ligne.\n\n' +
        'Cela garantit que vous disposez de toutes les informations nécessaires pour votre journée de travail.'
      );
    }

    try {
      // Vérifier si les tables critiques sont vides
      const tablesEmpty = await this.dbService.areTablesEmpty();

      if (tablesEmpty) {
        console.log('Critical tables are empty, checking for backup file...');
        await this.log.log('Critical tables are empty, checking for backup file...');

        // Chercher le fichier de backup le plus récent
        const backupFilePath = await this.dbService.findLatestBackupFile();

        if (backupFilePath) {
          console.log('Backup file found, restoring database...');
          await this.log.log('Backup file found, restoring database...');

          // Restaurer la base de données depuis le backup
          await this.dbService.restoreFromBackup(backupFilePath);

          console.log('Database restored successfully from backup');
          await this.log.log('Database restored successfully from backup');
        } else {
          console.warn('No backup file found, continuing with empty database');
          await this.log.log('No backup file found, continuing with empty database');
        }
      }
    } catch (error) {
      console.error('Error during backup restoration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log.log('Error during backup restoration: ' + errorMessage);
      // Continuer avec l'authentification même si la restauration échoue
    }

    // Procéder avec l'authentification offline normale
    let storedUser = await this.getUserLocally();

    if (!storedUser) {
      // Si pas trouvé dans les préférences, chercher dans SQLite
      storedUser = await this.dbService.getUserByUsername(username);
      if (storedUser) {
        // Si trouvé dans SQLite, le sauvegarder dans les préférences pour la prochaine fois
        await this.saveUserLocally(storedUser);
      }
    }

    if (storedUser && storedUser.username === username && storedUser.passwordHash === this.hashPassword(passwordPlain)) {
      this._user = storedUser;
      this._isAuthenticated = true;
      console.log('Offline login successful');
      await this.log.log('Offline login successful');
      // Dispatch login success to update the store
      this.store.dispatch(AuthActions.loginSuccess({ user: storedUser }));
      return true;
    } else if (storedUser && storedUser.username === username && storedUser.passwordHash !== this.hashPassword(passwordPlain)) {
      console.warn('Offline login failed: Incorrect password');
      await this.log.log('Offline login failed: Incorrect password');
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
    } else {
      console.warn('Offline login failed: User not configured');
      await this.log.log('Offline login failed: User not configured');
      throw new Error('Utilisateur non configuré pour cet appareil !');
    }
  }

  private async saveUserLocally(user: User): Promise<void> {
    await Preferences.set({ key: 'currentUser', value: JSON.stringify(user) });
    // Also save to SQLite if needed
    // Example: await this.dbService.saveUser(user);
  }

  private async getUserLocally(): Promise<User | null> {
    const { value } = await Preferences.get({ key: 'currentUser' });
    return value ? JSON.parse(value) : null;
  }

  // Simple hash for demonstration. In production, use a robust crypto library.
  private hashPassword(password: string): string {
    return btoa(password); // Base64 encode for simplicity
  }
}
