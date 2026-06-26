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
              id: '1', reference: 'CRD-1', totalAmount: 100, paidAmount: 40, remainingAmount: 60, status: 'LIVRE', items: [],
            }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PurchaseDetailPage);
  });

  it('loads purchase detail', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.purchase?.reference).toBe('CRD-1');
    expect(fixture.componentInstance.progressPercent).toBe(40);
  });
});
