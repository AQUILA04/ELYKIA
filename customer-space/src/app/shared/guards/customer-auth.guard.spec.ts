import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CustomerSessionService } from '../services/customer-session.service';

describe('CustomerAuthGuard', () => {
  let guard: CustomerAuthGuard;
  let session: jasmine.SpyObj<CustomerSessionService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    session = jasmine.createSpyObj('CustomerSessionService', [], {
      isAuthenticated: false,
    });
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        CustomerAuthGuard,
        { provide: CustomerSessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });
    guard = TestBed.inject(CustomerAuthGuard);
  });

  it('redirects to auth when not authenticated', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => false });
    expect(guard.canActivate()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/auth']);
  });

  it('allows access when authenticated', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => true });
    expect(guard.canActivate()).toBeTrue();
  });
});
