import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { CustomerArticle } from '../models/customer.model';

describe('CartService', () => {
  let service: CartService;
  const article: CustomerArticle = {
    id: 'a1', name: 'Test', category: 'X', creditSalePrice: 10000, available: true,
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  afterEach(() => sessionStorage.clear());

  it('adds and totals items', () => {
    service.add(article, 2);
    expect(service.totalItems).toBe(2);
    expect(service.totalAmount).toBe(20000);
  });

  it('persists to sessionStorage', () => {
    service.add(article);
    const raw = sessionStorage.getItem('elykia_customer_cart');
    expect(raw).toContain('a1');
  });

  it('clears cart', () => {
    service.add(article);
    service.clear();
    expect(service.totalItems).toBe(0);
  });
});
