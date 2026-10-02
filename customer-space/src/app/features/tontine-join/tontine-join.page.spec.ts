import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TontineJoinPage } from './tontine-join.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { LayoutService } from '../../shared/layout/layout.service';

describe('TontineJoinPage', () => {
  let fixture: ComponentFixture<TontineJoinPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('CustomerApiService', [
      'getCurrentTontineSession',
      'getTontineJoinRecipients',
      'joinTontineSession',
    ]);
    api.getCurrentTontineSession.and.returnValue(
      of({
        available: true,
        year: 2026,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        status: 'ACTIVE',
        joinable: true,
        alreadyMember: false,
        minDailyStake: 100,
      }),
    );
    api.getTontineJoinRecipients.and.returnValue(
      of({ mixxNumber: '90001111', moovNumber: '90002222' }),
    );
    api.joinTontineSession.and.returnValue(
      of({
        memberId: '42',
        sessionYear: 2026,
        dailyStake: 200,
        initialPaymentStatus: null,
      }),
    );
    // NavController (Ionic) subscribes to router.events at construction.
    router = jasmine.createSpyObj('Router', ['navigate'], {
      events: EMPTY,
      url: '/',
    });

    await TestBed.configureTestingModule({
      imports: [TontineJoinPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: CustomerApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: LayoutService, useValue: { isDesktop: () => false, refresh: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TontineJoinPage);
  });

  async function enterPage(): Promise<void> {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads joinable session and estimates monthly amount with 31 days', async () => {
    await enterPage();
    expect(fixture.componentInstance.session?.year).toBe(2026);
    fixture.componentInstance.selectShortcut(500);
    expect(fixture.componentInstance.monthlyEstimate).toBe(15500);
  });

  it('estimates remaining months from today to session end, capped at 10', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 5, 15)); // 15 juin 2026
      await enterPage();
      fixture.componentInstance.selectShortcut(100);
      // juin → novembre inclus = 6 mois
      expect(fixture.componentInstance.remainingSessionMonths).toBe(6);
      expect(fixture.componentInstance.sessionEstimate).toBe(6 * 31 * 100);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('uses full session months when joining before session start', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 0, 10)); // 10 janv 2026, session démarre le 1er fév
      await enterPage();
      // fév → nov = 10 mois
      expect(fixture.componentInstance.remainingSessionMonths).toBe(10);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('returns 0 months when joining after session end', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 11, 1)); // 1er déc 2026
      await enterPage();
      expect(fixture.componentInstance.remainingSessionMonths).toBe(0);
      expect(fixture.componentInstance.sessionEstimate).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('caps remaining months at 10 for a long session', async () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 0, 1));
      api.getCurrentTontineSession.and.returnValue(
        of({
          available: true,
          year: 2026,
          startDate: '2026-01-01',
          endDate: '2027-06-30',
          status: 'ACTIVE',
          joinable: true,
          alreadyMember: false,
          minDailyStake: 100,
        }),
      );
      await enterPage();
      expect(fixture.componentInstance.remainingSessionMonths).toBe(10);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('prefers Mixx then Moov then fallback for deposit destination', async () => {
    await enterPage();
    expect(fixture.componentInstance.depositDestinationNumber).toBe('90001111');

    fixture.componentInstance.recipients = { moovNumber: '90002222' };
    expect(fixture.componentInstance.depositDestinationNumber).toBe('90002222');

    fixture.componentInstance.recipients = {};
    expect(fixture.componentInstance.depositDestinationNumber).toBe('96186822');
  });

  it('redirects to member detail when already a member', async () => {
    api.getCurrentTontineSession.and.returnValue(
      of({
        available: true,
        year: 2026,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        status: 'ACTIVE',
        joinable: false,
        alreadyMember: true,
        memberId: '99',
        minDailyStake: 100,
      }),
    );
    await enterPage();
    expect(router.navigate).toHaveBeenCalledWith(['/tontines', '99'], { replaceUrl: true });
  });

  it('reloads session on ionViewWillEnter when not in success state', async () => {
    await enterPage();
    api.getCurrentTontineSession.calls.reset();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    expect(api.getCurrentTontineSession).toHaveBeenCalled();
  });

  it('submits join without payment', async () => {
    await enterPage();
    fixture.componentInstance.selectShortcut(200);
    await fixture.componentInstance.submit();
    expect(api.joinTontineSession).toHaveBeenCalledWith({ dailyStake: 200 });
    expect(fixture.componentInstance.success?.memberId).toBe('42');
  });
});
