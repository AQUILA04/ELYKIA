import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesktopSidebarComponent } from './desktop-sidebar.component';
import { CustomerSessionService } from '../../services/customer-session.service';
import { CartService } from '../../services/cart.service';
import { BehaviorSubject } from 'rxjs';

describe('DesktopSidebarComponent', () => {
  let fixture: ComponentFixture<DesktopSidebarComponent>;
  let sessionSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    sessionSubject = new BehaviorSubject({
      fullName: 'Ada Lovelace',
      phone: '90000000',
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    await TestBed.configureTestingModule({
      imports: [DesktopSidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: CustomerSessionService,
          useValue: {
            session$: sessionSubject.asObservable(),
            currentSession: sessionSubject.value,
            clearSession: jasmine.createSpy('clearSession'),
          },
        },
        {
          provide: CartService,
          useValue: {
            cart$: new BehaviorSubject([]).asObservable(),
            totalItems: 2,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesktopSidebarComponent);
    fixture.detectChanges();
  });

  it('renders navigation links with e2e-nav test ids', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="e2e-desktop-sidebar"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="e2e-nav-dashboard"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="e2e-nav-purchases"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="e2e-nav-catalog"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="e2e-nav-cart"]')).toBeTruthy();
  });

  it('shows cart badge when cart has items', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="e2e-nav-cart-badge"]')?.textContent?.trim()).toBe('2');
  });
});
