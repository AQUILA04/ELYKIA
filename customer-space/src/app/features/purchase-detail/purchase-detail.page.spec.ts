import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PurchaseDetailPage } from './purchase-detail.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('PurchaseDetailPage', () => {
  let fixture: ComponentFixture<PurchaseDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseDetailPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '1' } } } },
        {
          provide: CustomerApiService,
          useValue: {
            getPurchaseById: () => of({
              id: '1',
              reference: 'C26883503',
              totalAmount: 400,
              paidAmount: 0,
              remainingAmount: 400,
              dailyPayment: 400,
              status: 'INPROGRESS',
              items: [],
              paidInstallmentCount: 0,
              installmentCount: 12,
            }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PurchaseDetailPage);
  });

  it('loads purchase detail and shows EN COURS for INPROGRESS', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.purchase?.reference).toBe('C26883503');
    expect(fixture.componentInstance.statusLabel).toBe('EN COURS');
    expect(fixture.componentInstance.canPay).toBeTrue();
    expect(fixture.componentInstance.paymentQueryParams).toEqual({ amount: 400, installment: 1 });
  });
});
