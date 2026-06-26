import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogPage } from './catalog.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CartService } from '../../shared/services/cart.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('CatalogPage', () => {
  let fixture: ComponentFixture<CatalogPage>;
  const articles = [
    { id: 'art-1', name: 'TV', category: 'Electro', creditSalePrice: 150000, available: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        CartService,
        { provide: CustomerApiService, useValue: { getArticles: () => of(articles) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogPage);
  });

  it('loads articles and adds to cart', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.articles.length).toBe(1);
    fixture.componentInstance.add(articles[0]);
    expect(fixture.componentInstance.qty('art-1')).toBe(1);
  });
});
