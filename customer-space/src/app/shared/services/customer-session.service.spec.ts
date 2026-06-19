import { TestBed } from '@angular/core/testing';
import { CustomerSessionService } from './customer-session.service';
import { CustomerSession } from '../models/customer-auth.model';

describe('CustomerSessionService', () => {
  let service: CustomerSessionService;

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
    TestBed.configureTestingModule({});
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
  });

  it('clears session on logout', () => {
    service.saveSession(validSession);
    service.clearSession();
    expect(service.isAuthenticated).toBeFalse();
    expect(service.currentSession).toBeNull();
  });
});
