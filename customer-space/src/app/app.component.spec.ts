import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AppComponent } from './app.component';
import { CustomerSessionService } from './shared/services/customer-session.service';
import { LayoutService } from './shared/layout/layout.service';
import { UserJournalService } from './core/telemetry/user-journal.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerSession } from './shared/models/customer-auth.model';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let sessionSubject: BehaviorSubject<CustomerSession | null>;
  let sessionMock: {
    session$: BehaviorSubject<CustomerSession | null>;
    isAuthenticated: boolean;
    currentSession: CustomerSession | null;
  };
  let journal: jasmine.SpyObj<UserJournalService>;

  beforeEach(async () => {
    sessionSubject = new BehaviorSubject<CustomerSession | null>(null);
    sessionMock = {
      session$: sessionSubject,
      isAuthenticated: false,
      currentSession: null,
    };
    journal = jasmine.createSpyObj('UserJournalService', [
      'track', 'setScreen', 'bindUser', 'init',
    ]);
    journal.setScreen.and.resolveTo();
    journal.bindUser.and.resolveTo();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [CommonModule, IonicModule.forRoot(), RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CustomerSessionService, useValue: sessionMock },
        { provide: UserJournalService, useValue: journal },
        LayoutService,
      ],
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
    sessionMock.isAuthenticated = true;
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
    sessionMock.isAuthenticated = true;
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
