import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { CustomerSessionService } from './shared/services/customer-session.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let session: jasmine.SpyObj<CustomerSessionService>;

  beforeEach(async () => {
    session = jasmine.createSpyObj('CustomerSessionService', [], {
      isAuthenticated: false,
    });

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [CommonModule, IonicModule.forRoot(), RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: CustomerSessionService, useValue: session }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('shows splash then hides it', fakeAsync(() => {
    (window as Window & { __E2E__?: boolean }).__E2E__ = true;
    fixture.detectChanges();
    expect(fixture.componentInstance.showSplash).toBeTrue();
    tick(1);
    expect(fixture.componentInstance.showSplash).toBeFalse();
    delete (window as Window & { __E2E__?: boolean }).__E2E__;
  }));

  it('navigates to dashboard when authenticated on auth route after splash', fakeAsync(() => {
    (window as Window & { __E2E__?: boolean }).__E2E__ = true;
    Object.defineProperty(session, 'isAuthenticated', { get: () => true });
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    history.pushState({}, '', '/auth');

    fixture.detectChanges();
    tick(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
    history.pushState({}, '', '/');
    delete (window as Window & { __E2E__?: boolean }).__E2E__;
  }));

  it('does not redirect to dashboard when authenticated on a deep link', fakeAsync(() => {
    (window as Window & { __E2E__?: boolean }).__E2E__ = true;
    Object.defineProperty(session, 'isAuthenticated', { get: () => true });
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    history.pushState({}, '', '/catalog');

    fixture.detectChanges();
    tick(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    history.pushState({}, '', '/');
    delete (window as Window & { __E2E__?: boolean }).__E2E__;
  }));
});
