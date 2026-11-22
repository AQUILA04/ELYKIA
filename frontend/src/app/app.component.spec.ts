import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NgxPermissionsService } from 'ngx-permissions';
import { AppComponent } from './app.component';
import { AuthService } from './auth/service/auth.service';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { UnitPriceVisibilityService } from '@shared/service/unit-price-visibility.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: NgxPermissionsService,
          useValue: { flushPermissions: vi.fn(), loadPermissions: vi.fn() },
        },
        { provide: TokenStorageService, useValue: { getUser: vi.fn().mockReturnValue(null) } },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: vi.fn().mockReturnValue(true),
            loadPermissionsFromCurrentUser: vi.fn(),
          },
        },
        {
          provide: UnitPriceVisibilityService,
          useValue: { ensureLoaded: vi.fn().mockReturnValue(of(false)) },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mounts root router-outlet and ngx-sonner-toaster', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('ngx-sonner-toaster')).not.toBeNull();
  });
});
