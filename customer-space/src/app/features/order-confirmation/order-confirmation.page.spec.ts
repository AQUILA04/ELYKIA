import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { OrderConfirmationPage } from './order-confirmation.page';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('OrderConfirmationPage', () => {
  let fixture: ComponentFixture<OrderConfirmationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'reference' ? 'CMD-2026-001' : '50000'),
              },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderConfirmationPage);
  });

  it('reads reference and amount from query params', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.reference).toBe('CMD-2026-001');
    expect(fixture.componentInstance.totalAmount).toBe(50000);
  });
});
