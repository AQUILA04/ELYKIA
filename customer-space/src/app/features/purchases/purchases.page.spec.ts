import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PurchasesPage } from './purchases.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('PurchasesPage', () => {
  let fixture: ComponentFixture<PurchasesPage>;
  const mockPurchases = [
    { id: '1', reference: 'CRD-1', totalAmount: 100, paidAmount: 50, remainingAmount: 50, status: 'LIVRE', articleCount: 1, paidInstallmentCount: 1, installmentCount: 10 },
    { id: '2', reference: 'CRD-2', totalAmount: 200, paidAmount: 0, remainingAmount: 200, status: 'INITIE', articleCount: 1, paidInstallmentCount: 0, installmentCount: 10 },
  ] as any[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchasesPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: CustomerApiService, useValue: { getPurchases: () => of(mockPurchases) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PurchasesPage);
  });

  it('loads and filters purchases', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.purchases.length).toBe(2);
    fixture.componentInstance.setFilter('LIVRE');
    expect(fixture.componentInstance.filtered.length).toBe(1);
  });
});
