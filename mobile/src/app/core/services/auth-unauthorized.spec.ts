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

  beforeEach(() => {
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'remove').and.resolveTo();
    spyOn(Preferences, 'set').and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideMockStore(),
        { provide: HttpClient, useValue: {} },
        { provide: DatabaseService, useValue: {} },
        { provide: LoggerService, useValue: { log: () => Promise.resolve() } },
        { provide: HealthCheckService, useValue: {} },
        { provide: Storage, useValue: {} },
        { provide: MemoryManagementService, useValue: {} },
        { provide: InitializationValidationService, useValue: {} },
        { provide: DailyConsentStateService, useValue: {} },
        { provide: DeviceIdentityService, useValue: {} },
        { provide: FeatureFlagService, useValue: {} },
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
});
