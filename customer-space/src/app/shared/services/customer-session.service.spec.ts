import { TestBed } from '@angular/core/testing';
import { CustomerSessionService } from './customer-session.service';
import { CustomerSession } from '../models/customer-auth.model';
import { UserJournalService } from '../../core/telemetry/user-journal.service';

describe('CustomerSessionService', () => {
  let service: CustomerSessionService;
  let journal: jasmine.SpyObj<UserJournalService>;

  const validSession: CustomerSession = {
    token: 'tok',
    clientId: '1',
    fullName: 'Test User',
    phone: '90123456',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    isAuthenticated: true,
  };

  beforeEach(() => {
    localStorage.clear();
    journal = jasmine.createSpyObj('UserJournalService', [
      'track', 'bindUser', 'unbindUser', 'flush',
    ]);
    journal.bindUser.and.resolveTo();
    journal.unbindUser.and.resolveTo();
    journal.flush.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [{ provide: UserJournalService, useValue: journal }],
    });
    service = TestBed.inject(CustomerSessionService);
  });

  afterEach(() => localStorage.clear());

  it('starts unauthenticated', () => {
    expect(service.isAuthenticated).toBeFalse();
  });

  it('persists and restores session', () => {
    service.saveSession(validSession);
    expect(service.isAuthenticated).toBeTrue();
    expect(service.currentSession?.fullName).toBe('Test User');
    expect(journal.track).toHaveBeenCalledWith('LOGIN_SUCCESS', 'AUTH', jasmine.any(Object));
  });

  it('clears session on logout', () => {
    service.saveSession(validSession);
    service.clearSession();
    expect(service.isAuthenticated).toBeFalse();
    expect(service.currentSession).toBeNull();
    expect(journal.track).toHaveBeenCalledWith('LOGOUT', 'AUTH');
  });

  it('updates activationStatus without changing the token', () => {
    service.saveSession({ ...validSession, activationStatus: 'PENDING' });
    service.updateActivationStatus('ACTIVE');
    expect(service.currentSession?.activationStatus).toBe('ACTIVE');
    expect(service.currentSession?.token).toBe('tok');
  });

  it('ignores updateActivationStatus when unchanged or empty', () => {
    service.saveSession({ ...validSession, activationStatus: 'PENDING' });
    service.updateActivationStatus('PENDING');
    service.updateActivationStatus(null);
    expect(service.currentSession?.activationStatus).toBe('PENDING');
  });
});
