import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CustomerSessionService } from '../services/customer-session.service';

describe('CustomerAuthGuard', () => {
  let guard: CustomerAuthGuard;
  let session: jasmine.SpyObj<CustomerSessionService>;
  let router: jasmine.SpyObj<Router>;
  const route = {} as ActivatedRouteSnapshot;
  const stateFor = (url: string) => ({ url } as RouterStateSnapshot);

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

  it('redirects to auth with returnUrl when not authenticated', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => false });
    expect(guard.canActivate(route, stateFor('/catalog'))).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], {
      replaceUrl: true,
      queryParams: { returnUrl: '/catalog' },
    });
  });

  it('keeps query string of the requested page in returnUrl', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => false });
    guard.canActivate(route, stateFor('/order-confirmation?reference=CMD-1'));
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], {
      replaceUrl: true,
      queryParams: { returnUrl: '/order-confirmation?reference=CMD-1' },
    });
  });

  it('redirects to auth without returnUrl for the root url', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => false });
    guard.canActivate(route, stateFor('/'));
    expect(router.navigate).toHaveBeenCalledWith(['/auth'], { replaceUrl: true });
  });

  it('allows access when authenticated', () => {
    Object.defineProperty(session, 'isAuthenticated', { get: () => true });
    expect(guard.canActivate(route, stateFor('/catalog'))).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
