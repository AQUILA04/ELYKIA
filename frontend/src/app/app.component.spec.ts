import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NgxPermissionsService } from 'ngx-permissions';
import { AppComponent } from './app.component';
import { AuthService } from './auth/service/auth.service';
import { LayoutService } from './shared/service/layout.service';
import { TokenStorageService } from './shared/service/token-storage.service';
import { UnitPriceVisibilityService } from './shared/service/unit-price-visibility.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideRouter([]),
        { provide: NgxPermissionsService, useValue: { flushPermissions: vi.fn(), loadPermissions: vi.fn() } },
        { provide: TokenStorageService, useValue: { getUser: vi.fn().mockReturnValue(null) } },
        { provide: AuthService, useValue: { isLoggedIn: vi.fn().mockReturnValue(true), loadPermissionsFromCurrentUser: vi.fn() } },
        { provide: LayoutService, useValue: { isSidebarOpen$: of(false) } },
        { provide: UnitPriceVisibilityService, useValue: { ensureLoaded: vi.fn().mockReturnValue(of(false)) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show header and sidebar by default', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.showHeaderAndSidebar).toBe(true);
  });
});
