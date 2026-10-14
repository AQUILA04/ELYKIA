import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { of } from 'rxjs';
import { ArticleSelectorComponent } from './article-selector.component';
import { ItemService } from 'src/app/article/service/item.service';

describe('ArticleSelectorComponent', () => {
  let component: ArticleSelectorComponent;
  let fixture: ComponentFixture<ArticleSelectorComponent>;

  const articles = [
    { id: 1, name: 'Article A', purchasePrice: 200, sellingPrice: 300, creditSalePrice: 350, stockQuantity: 10 },
    { id: 2, name: 'Article B', purchasePrice: 250, sellingPrice: 400, creditSalePrice: 450, stockQuantity: 5 },
    {
      id: 3,
      name: 'Article C',
      purchasePrice: 200,
      sellingPrice: 300,
      creditSalePrice: 350,
      stockQuantity: 10,
      packagingType: 'CARTON',
      unitsPerPackage: 24,
      wholesalePurchasePrice: 5000
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArticleSelectorComponent],
      imports: [ReactiveFormsModule, NgSelectModule],
      providers: [
        {
          provide: ItemService,
          useValue: {
            getEnabledArticlesPage: jasmine.createSpy('getEnabledArticlesPage').and.returnValue(of({ data: { content: [] } })),
            getArticleById: jasmine.createSpy('getArticleById').and.returnValue(of({ data: null }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleSelectorComponent);
    component = fixture.componentInstance;
    component.articles = articles;
    component.capturePurchasePrice = true;
    component.priceType = 'inventory';
    fixture.detectChanges();
  });

  it('prefills unitPrice with catalog purchasePrice when article is selected', () => {
    const row = component.articlesArray.at(0);
    row.patchValue({ articleId: 1, quantity: 3 });
    fixture.detectChanges();

    expect(row.get('unitPrice')?.value).toBe(200);
  });

  it('resets unitPrice when article changes', () => {
    const row = component.articlesArray.at(0);
    row.patchValue({ articleId: 1, quantity: 3 });
    row.patchValue({ unitPrice: 215 });
    row.patchValue({ articleId: 2 });

    expect(row.get('unitPrice')?.value).toBe(250);
  });

  it('computes wholesale quantity and unit price from packaging', () => {
    const row = component.articlesArray.at(0);
    row.patchValue({ articleId: 3 });
    row.patchValue({ entryPackagingMode: 'WHOLESALE', packageCount: 2, packagePrice: 5000 });
    fixture.detectChanges();

    expect(component.hasArticlePackaging(3)).toBeTrue();
    expect(component.getComputedQuantity(0)).toBe(48);
    expect(component.getComputedUnitPrice(0)).toBe(208.33);
    expect(component.getComputedLineTotal(0)).toBe(10000);
  });
});

describe('ArticleSelectorComponent lazy edit', () => {
  let component: ArticleSelectorComponent;
  let fixture: ComponentFixture<ArticleSelectorComponent>;
  let getArticleById: jasmine.Spy;

  const pageArticles = [
    { id: 1, commercialName: 'HUILE: aicha 5l', creditSalePrice: 6000, stockQuantity: 24 }
  ];

  beforeEach(async () => {
    getArticleById = jasmine.createSpy('getArticleById').and.returnValue(of({
      data: {
        id: 99,
        commercialName: 'SPAGHETTI: BONITA PETIT GRAIN',
        creditSalePrice: 400,
        stockQuantity: 561
      }
    }));

    await TestBed.configureTestingModule({
      declarations: [ArticleSelectorComponent],
      imports: [ReactiveFormsModule, NgSelectModule],
      providers: [
        {
          provide: ItemService,
          useValue: {
            getEnabledArticlesPage: jasmine.createSpy('getEnabledArticlesPage').and.returnValue(of({
              data: { content: pageArticles, totalElements: 1, totalPages: 1 }
            })),
            getArticleById
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleSelectorComponent);
    component = fixture.componentInstance;
    component.lazyLoad = true;
    component.priceType = 'credit';
    component.showPrices = true;
    fixture.detectChanges();
  });

  it('keeps price and stock for an article already returned with the request', () => {
    component.writeValue([
      {
        articleId: 1,
        quantity: 1,
        article: pageArticles[0]
      }
    ]);

    expect(getArticleById).not.toHaveBeenCalled();
    expect(component.getArticlePrice(1)).toBe(6000);
    expect(component.getArticleStock(1)).toBe(24);
    expect(component.getLineTotal(0)).toBe(6000);
    expect(component.availableArticlesPerRow[0].some(article => article.id === 1)).toBeTrue();
  });

  it('loads an article missing from the first catalog page', () => {
    component.writeValue([
      { articleId: 99, quantity: 25 }
    ]);

    expect(getArticleById).toHaveBeenCalledWith(99);
    expect(component.getArticlePrice(99)).toBe(400);
    expect(component.getArticleStock(99)).toBe(561);
    expect(component.getLineTotal(0)).toBe(10000);
    expect(component.availableArticlesPerRow[0].some(article => article.id === 99)).toBeTrue();
  });
});
