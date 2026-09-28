import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RecoveryTimelinePage } from './recovery-timeline.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('RecoveryTimelinePage', () => {
  let fixture: ComponentFixture<RecoveryTimelinePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecoveryTimelinePage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '101' } } } },
        {
          provide: CustomerApiService,
          useValue: {
            getRecoveries: () => of([]),
            getPurchaseById: () => of({
              id: '101',
              reference: 'C1',
              totalAmount: 400,
              paidAmount: 0,
              remainingAmount: 400,
              dailyPayment: 400,
              status: 'INPROGRESS',
              paidInstallmentCount: 0,
              installmentCount: 12,
              items: [],
            }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RecoveryTimelinePage);
  });

  it('allows paying next mise even when timeline is empty', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.recoveries.length).toBe(0);
    expect(fixture.componentInstance.canPay).toBeTrue();
    expect(fixture.componentInstance.paymentQueryParams()).toEqual({ amount: 400, installment: 1 });
  });
});
