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
