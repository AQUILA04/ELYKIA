import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CartPage } from './cart.page';
import { CartService } from '../../shared/services/cart.service';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('CartPage', () => {
  let fixture: ComponentFixture<CartPage>;
  let cart: CartService;
  const article = { id: 'art-1', name: 'TV', category: 'X', creditSalePrice: 10000, available: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        CartService,
        {
          provide: CustomerApiService,
          useValue: {
            submitOrder: () => of({ reference: 'CMD-1', totalAmount: 10000 }),
          },
        },
      ],
    }).compileComponents();
    cart = TestBed.inject(CartService);
    cart.add(article);
    fixture = TestBed.createComponent(CartPage);
  });

  it('shows cart lines and submits order', async () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.lines.length).toBe(1);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    await fixture.componentInstance.submitOrder();
    expect(router.navigate).toHaveBeenCalled();
    expect(cart.totalItems).toBe(0);
  });
});
