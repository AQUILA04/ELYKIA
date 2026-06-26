import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PaymentPage } from './payment.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('PaymentPage', () => {
  let fixture: ComponentFixture<PaymentPage>;
  let api: jasmine.SpyObj<CustomerApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('CustomerApiService', ['submitMobileMoneyPayment']);
    api.submitMobileMoneyPayment.and.returnValue(of({ id: '1' } as any));

    await TestBed.configureTestingModule({
      imports: [PaymentPage, ReactiveFormsModule, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: { id: '101' },
              queryParamMap: { get: (k: string) => (k === 'amount' ? '35000' : '3') },
            },
          },
        },
        { provide: CustomerApiService, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PaymentPage);
  });

  it('prefills amount from query params', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.expectedAmount).toBe(35000);
    expect(fixture.componentInstance.form.value.mobileMoneyAmount).toBe(35000);
  });

  it('submits mobile money payment', async () => {
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({
      mobileMoneyPhone: '90123456',
      mobileMoneyAmount: 35000,
      mobileMoneyReference: 'TXN-123',
    });
    await fixture.componentInstance.submit();
    expect(api.submitMobileMoneyPayment).toHaveBeenCalled();
    expect(fixture.componentInstance.isSubmitted).toBeTrue();
  });
});
