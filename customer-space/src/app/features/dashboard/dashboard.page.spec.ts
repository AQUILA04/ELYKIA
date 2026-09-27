import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardPage } from './dashboard.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { AppUpdateService } from '../../shared/services/app-update.service';
import { CustomerNotificationInboxService } from '../../shared/services/customer-notification-inbox.service';
import { IonicModule, AlertController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let session: CustomerSessionService;

  const mockDashboard = {
    clientId: '1',
    fullName: 'Jean K.',
    activeCreditCount: 1,
    totalCreditAmount: 350_000,
    totalPaidAmount: 120_000,
    totalRemainingAmount: 230_000,
    nextPaymentAmount: 35_000,
    nextPaymentDate: '2026-06-20',
    nextPaymentCreditId: '101',
    nextInstallmentNumber: 3,
    progressPercent: 34,
    recentActivities: [],
    activationStatus: 'ACTIVE',
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj('CustomerApiService', ['getDashboard']);
    api.getDashboard.and.returnValue(of(mockDashboard));

    await TestBed.configureTestingModule({
      imports: [DashboardPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: CustomerApiService, useValue: api },
        CustomerSessionService,
        {
          provide: AppUpdateService,
          useValue: jasmine.createSpyObj('AppUpdateService', ['checkForUpdate', 'downloadAndInstall']),
        },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj('AlertController', ['create']),
        },
        {
          provide: CustomerNotificationInboxService,
          useValue: jasmine.createSpyObj('CustomerNotificationInboxService', ['refresh'], {
            unreadCount$: of(0),
          }),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    session = TestBed.inject(CustomerSessionService);
    session.saveSession({
      token: 't',
      clientId: '1',
      fullName: 'Jean K.',
      phone: '70155169',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      isAuthenticated: true,
      activationStatus: 'PENDING',
    });
  });

  it('loads dashboard data on ionViewWillEnter', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.dashboard?.fullName).toBe('Jean K.');
    expect(fixture.componentInstance.isLoading).toBeFalse();
  });

  it('syncs session activationStatus when dashboard becomes ACTIVE', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(session.currentSession?.activationStatus).toBe('ACTIVE');
  });

  it('reloads dashboard each time the view enters', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance.ionViewWillEnter();
    expect(api.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('sets loadError on API failure', () => {
    api.getDashboard.and.returnValue(throwError(() => new Error('fail')));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError).toBeTrue();
  });

  it('enables pay action when next payment is available', () => {
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.canPayNext).toBeTrue();
    expect(fixture.componentInstance.paymentQueryParams).toEqual({
      amount: 35_000,
      installment: 3,
    });
  });

  it('disables pay action when no credit id for next payment', () => {
    api.getDashboard.and.returnValue(of({
      ...mockDashboard,
      nextPaymentCreditId: undefined,
      nextInstallmentNumber: 0,
    }));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.canPayNext).toBeFalse();
    expect(fixture.componentInstance.paymentQueryParams).toBeNull();
  });

  it('keeps pay action disabled while dashboard is loading', () => {
    api.getDashboard.and.returnValue(of(mockDashboard));
    expect(fixture.componentInstance.canPayNext).toBeFalse();
    expect(fixture.componentInstance.paymentQueryParams).toBeNull();
  });
});
