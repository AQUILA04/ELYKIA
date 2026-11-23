import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { LoggerService } from './logger.service';
import { HealthCheckService } from './health-check.service';
import { Storage } from '@ionic/storage-angular';
import { MemoryManagementService } from './memory-management.service';
import { InitializationValidationService } from './initialization-validation.service';
import { DailyConsentStateService } from '../daily-consent/daily-consent-state.service';
import { DeviceIdentityService } from './device-identity.service';
import { FeatureFlagService } from './feature-flag.service';
import * as AuthActions from '../../store/auth/auth.actions';

describe('AuthService session expiry', () => {
  let service: AuthService;
  let store: MockStore;
  let http: { post: jasmine.Spy };
  let featureFlags: { isFeatureEnabled: jasmine.Spy };

  // Les spies sur Preferences ne tiennent pas toujours (proxy Capacitor) : on isole le stockage web.
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  beforeEach(() => {
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'remove').and.resolveTo();
    spyOn(Preferences, 'set').and.resolveTo();

    http = { post: jasmine.createSpy('post') };
    featureFlags = { isFeatureEnabled: jasmine.createSpy('isFeatureEnabled').and.returnValue(false) };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideMockStore(),
        { provide: HttpClient, useFactory: () => http },
        { provide: DatabaseService, useValue: {} },
        { provide: LoggerService, useValue: { log: () => Promise.resolve() } },
        { provide: HealthCheckService, useValue: {} },
        { provide: Storage, useValue: {} },
        { provide: MemoryManagementService, useValue: {} },
        { provide: InitializationValidationService, useValue: {} },
        { provide: DailyConsentStateService, useValue: {} },
        { provide: DeviceIdentityService, useValue: {} },
        { provide: FeatureFlagService, useFactory: () => featureFlags },
      ],
    });

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
    service = TestBed.inject(AuthService);
  });

  function markAuthenticated(): void {
    (service as unknown as { openSession(): void }).openSession();
  }

  it('does nothing when nobody is signed in', () => {
    expect(service.handleUnauthorized()).toBeFalse();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(service.consumeSessionExpiredNotice()).toBeFalse();
  });

  it('dispatches logout once and keeps a notice for the login screen', () => {
    markAuthenticated();

    expect(service.handleUnauthorized()).toBeTrue();
    expect(service.handleUnauthorized()).toBeTrue();

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.logout());
    expect(service.consumeSessionExpiredNotice()).toBeTrue();
    expect(service.consumeSessionExpiredNotice()).toBeFalse();
  });

  it('can expire again after a new session', () => {
    markAuthenticated();
    service.handleUnauthorized();
    (store.dispatch as jasmine.Spy).calls.reset();

    markAuthenticated();
    expect(service.handleUnauthorized()).toBeTrue();
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it('announces an expired session once, without logging out, when entries are kept', () => {
    markAuthenticated();
    let emitted = 0;
    service.sessionExpiredKeptData$.subscribe(() => emitted++);

    service.notifySessionExpiredKeepingData();
    service.notifySessionExpiredKeepingData();

    expect(emitted).toBe(1);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('stays silent when nobody is signed in', () => {
    let emitted = 0;
    service.sessionExpiredKeptData$.subscribe(() => emitted++);
    service.notifySessionExpiredKeepingData();
    expect(emitted).toBe(0);
  });

  describe('refreshAccessToken', () => {
    const signIn = () => {
      (service as unknown as { _user: unknown })._user = {
        id: '1', username: 'rm', email: '', roles: [], accessToken: 'old', refreshToken: 'r1',
      };
      markAuthenticated();
    };

    it('stores the new access token and keeps the refresh token', async () => {
      signIn();
      http.post.and.returnValue(of({ accessToken: 'new', refreshToken: 'r1' }));

      expect(await service.refreshAccessToken()).toBeTrue();
      expect(service.currentUser?.accessToken).toBe('new');
    });

    it('shares a single call between concurrent requests', async () => {
      signIn();
      http.post.and.returnValue(of({ accessToken: 'new', refreshToken: 'r1' }));

      const results = await Promise.all([service.refreshAccessToken(), service.refreshAccessToken()]);

      expect(results).toEqual([true, true]);
      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('reports failure and leaves the session untouched when the server refuses', async () => {
      signIn();
      http.post.and.returnValue(throwError(() => new Error('refused')));

      expect(await service.refreshAccessToken()).toBeFalse();
      expect(service.currentUser?.accessToken).toBe('old');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('does nothing without an open session', async () => {
      expect(await service.refreshAccessToken()).toBeFalse();
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
