import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontinesPage } from './tontines.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';

describe('TontinesPage', () => {
  let fixture: ComponentFixture<TontinesPage>;
  let api: {
    getCurrentTontineSession: jasmine.Spy;
    getTontineContributions: jasmine.Spy;
  };

  beforeEach(async () => {
    api = {
      getCurrentTontineSession: jasmine.createSpy('getCurrentTontineSession').and.returnValue(
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
      ),
      getTontineContributions: jasmine
        .createSpy('getTontineContributions')
        .and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [TontinesPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [{ provide: CustomerApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(TontinesPage);
  });

  it('loads session and shows join CTA when joinable', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.session?.joinable).toBeTrue();
    expect(fixture.componentInstance.showJoinHero).toBeTrue();
    expect(fixture.componentInstance.isLoading).toBeFalse();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="e2e-tontine-join-btn"]')).toBeTruthy();
  });

  it('shows member list when already enrolled', () => {
    api.getCurrentTontineSession.and.returnValue(
      of({
        available: true,
        year: 2026,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        status: 'ACTIVE',
        joinable: false,
        alreadyMember: true,
        memberId: '1',
        minDailyStake: 100,
      }),
    );
    api.getTontineContributions.and.returnValue(
      of([{ memberId: '1', sessionYear: 2026, deliveryStatus: 'SESSION_INPROGRESS' }]),
    );
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.tontines.length).toBe(1);
    expect(fixture.componentInstance.showMemberBanner).toBeTrue();
    expect(fixture.componentInstance.showJoinHero).toBeFalse();
  });

  it('reloads session and contributions on ionViewWillEnter', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    api.getCurrentTontineSession.calls.reset();
    api.getTontineContributions.calls.reset();
    api.getCurrentTontineSession.and.returnValue(
      of({
        available: true,
        year: 2026,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        status: 'ACTIVE',
        joinable: false,
        alreadyMember: true,
        memberId: '7',
        minDailyStake: 100,
      }),
    );
    api.getTontineContributions.and.returnValue(
      of([{ memberId: '7', sessionYear: 2026, deliveryStatus: 'SESSION_INPROGRESS' }]),
    );
    fixture.componentInstance.ionViewWillEnter();
    expect(api.getCurrentTontineSession).toHaveBeenCalled();
    expect(api.getTontineContributions).toHaveBeenCalled();
    expect(fixture.componentInstance.showJoinHero).toBeFalse();
    expect(fixture.componentInstance.showMemberBanner).toBeTrue();
  });
});
