import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontineJoinPage } from './tontine-join.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';

describe('TontineJoinPage', () => {
  let fixture: ComponentFixture<TontineJoinPage>;
  let api: jasmine.SpyObj<CustomerApiService>;

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

    await TestBed.configureTestingModule({
      imports: [TontineJoinPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [{ provide: CustomerApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(TontineJoinPage);
  });

  it('loads joinable session and estimates monthly amount', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.session?.year).toBe(2026);
    fixture.componentInstance.selectShortcut(200);
    expect(fixture.componentInstance.monthlyEstimate).toBe(6000);
  });

  it('submits join without payment', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.selectShortcut(200);
    await fixture.componentInstance.submit();
    expect(api.joinTontineSession).toHaveBeenCalledWith({ dailyStake: 200 });
    expect(fixture.componentInstance.success?.memberId).toBe('42');
  });
});
