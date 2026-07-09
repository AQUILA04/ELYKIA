import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { Preferences } from '@capacitor/preferences';
import { Observable, from, throwError, firstValueFrom } from 'rxjs';
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
import { DailyConsentStateService } from '../daily-consent/daily-consent-state.service';
import { DeviceIdentityService } from './device-identity.service';
import { FeatureFlagService, FeatureFlags } from './feature-flag.service';
import { DEVICE_NOT_AUTHORIZED_CODE } from '../interceptors/device-auth.interceptor';

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
    private initValidationService: InitializationValidationService,
    private dailyConsentState: DailyConsentStateService,
    private deviceIdentityService: DeviceIdentityService,
    private featureFlagService: FeatureFlagService
  ) {
    this.loadUserFromPreferences();
  }

  private async loadUserFromPreferences() {
    const { value } = await Preferences.get({ key: 'currentUser' });
    if (value) {
      const user = JSON.parse(value);
      this._user = user;
      this._isAuthenticated = true;
      this.store.dispatch(AuthActions.loginSuccess({ user }));
      await this.dailyConsentState.restoreFromPreferences(user.username);
    }
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get currentUser(): User | null {
    return this._user;
  }

  mustChangePassword(): boolean {
    return this._user?.mustChangePassword === true;
  }

  async changePassword(newPassword: string, forced = false): Promise<void> {
    const user = this._user;
    if (!user?.id || !user.username) {
      throw new Error('Utilisateur non connecté.');
    }

    await firstValueFrom(this.http.patch(`${environment.apiUrl}/api/v1/users/change-password`, {
      id: Number(user.id),
      username: user.username,
      newPassword,
      forced,
    }));

    const updatedUser: User = {
      ...user,
      mustChangePassword: false,
      passwordHash: this.hashPassword(newPassword),
    };
    this._user = updatedUser;
    await this.saveUserLocally(updatedUser);
    this.store.dispatch(AuthActions.loginSuccess({ user: updatedUser }));
  }

  login(request: LoginRequest): Observable<boolean> {
    this.log.log('=== LOGIN PROCESS STARTED ===');
    this.log.log('Login attempt for: ' + request.username);
    this.log.log('Environment API URL: ' + environment.apiUrl);

    return from(this.buildLoginRequest(request)).pipe(
      switchMap(enrichedRequest => this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        this.log.log(`Health check result: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

        if (isOnline) {
          this.log.log('Backend is online, attempting API login.');
          return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/signin`, enrichedRequest).pipe(
            switchMap(response => from(this.processAuthResponse(response, enrichedRequest.password))),
            tap(() => {
              this._isAuthenticated = true;
              this.log.log('Online login successful.');
            }),
            catchError(error => {
              this.log.log('=== API LOGIN FAILED ===');
              this.log.log('API login error: ' + JSON.stringify(error, null, 2));
              if (this.isDeviceNotAuthorizedError(error)) {
                return throwError(() => new Error(this.getDeviceNotAuthorizedMessage(error)));
              }
              this.log.log('Falling back to offline authentication...');
              return from(this.authenticateOffline(enrichedRequest.username, enrichedRequest.password));
            })
          );
        } else {
          this.log.log('Backend is offline, attempting offline login.');
          return from(this.authenticateOffline(enrichedRequest.username, enrichedRequest.password));
        }
      }),
      catchError(err => {
        this.log.log('=== LOGIN PROCESS FAILED ===');
        this.log.log('Complete login failure: ' + JSON.stringify(err, null, 2));
        throw new Error(err.message || 'Une erreur est survenue lors de la connexion.');
      })
    )));
  }

  async handleDeviceNotAuthorized(): Promise<void> {
    await this.logout();
  }

  private async buildLoginRequest(request: LoginRequest): Promise<LoginRequest> {
    if (!this.featureFlagService.isFeatureEnabled(FeatureFlags.MobileDeviceRestriction)) {
      return request;
    }

    const device = await this.deviceIdentityService.getDeviceIdentity();
    return {
      ...request,
      deviceId: device.deviceId,
      deviceLabel: device.deviceLabel,
      platform: device.platform,
      model: device.model,
      appVersion: device.appVersion,
    };
  }

  private isDeviceNotAuthorizedError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
      return false;
    }
    const body = error.error;
    if (!body) {
      return false;
    }
    if (typeof body === 'string') {
      return body.includes(DEVICE_NOT_AUTHORIZED_CODE);
    }
    return body.code === DEVICE_NOT_AUTHORIZED_CODE;
  }

  private getDeviceNotAuthorizedMessage(error: HttpErrorResponse): string {
    const body = error.error;
    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }
    return 'Cet appareil n\'est pas autorisé pour ce compte. Contactez votre administrateur.';
  }

  private deviceRestrictionPreferenceKey(username: string): string {
    return `deviceRestrictionActive_${username}`;
  }

  async logout(): Promise<void> {
    const username = this._user?.username;
    this._user = null;
    this._isAuthenticated = false;
    await Preferences.remove({ key: 'currentUser' });
    await this.storage.remove('initialization_complete');
    await this.memoryManagementService.clearMemoryCache();
    if (username) {
      await this.dailyConsentState.clearConsent(username);
      await Preferences.remove({ key: this.deviceRestrictionPreferenceKey(username) });
    }
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
      passwordHash: this.hashPassword(passwordPlain),
      mustChangePassword: response.mustChangePassword === true,
    };
    this._user = user;
    await this.saveUserLocally(user);
    await Preferences.set({
      key: this.deviceRestrictionPreferenceKey(user.username),
      value: String(response.deviceRestrictionActive === true),
    });
    this.store.dispatch(AuthActions.loginSuccess({ user }));
    await this.dailyConsentState.restoreFromPreferences(user.username);
    return true;
  }

  private async authenticateOffline(username: string, passwordPlain: string): Promise<boolean> {
    if (this.featureFlagService.isFeatureEnabled(FeatureFlags.MobileDeviceRestriction)) {
      const { value } = await Preferences.get({ key: this.deviceRestrictionPreferenceKey(username) });
      if (value === 'true') {
        throw new Error(
          'Connexion internet requise pour vérifier l\'appareil autorisé.\n\n' +
          'Veuillez vous connecter au réseau de l\'entreprise pour vous authentifier.'
        );
      }
    }

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
      if (storedUser.mustChangePassword) {
        throw new Error(
          'Vous devez définir un nouveau mot de passe en ligne avant de continuer.\n\n' +
          'Connectez-vous au réseau de l\'entreprise pour finaliser le changement de mot de passe.'
        );
      }
      this._user = storedUser;
      this._isAuthenticated = true;
      console.log('Offline login successful');
      await this.log.log('Offline login successful');
      // Dispatch login success to update the store
      this.store.dispatch(AuthActions.loginSuccess({ user: storedUser }));
      await this.dailyConsentState.restoreFromPreferences(storedUser.username);
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

  /**
   * Vérifie le mot de passe saisi contre celui enregistré localement pour l'utilisateur courant.
   */
  async verifyCurrentUserPassword(passwordPlain: string): Promise<boolean> {
    const user = this._user ?? await this.getUserLocally();
    if (!user?.passwordHash) {
      return false;
    }
    return user.passwordHash === this.hashPassword(passwordPlain);
  }

  // Simple hash for demonstration. In production, use a robust crypto library.
  private hashPassword(password: string): string {
    return btoa(password); // Base64 encode for simplicity
  }
}
