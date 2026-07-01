import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ArticleSelectorComponent } from './article-selector.component';
import { ItemService } from 'src/app/article/service/item.service';

describe('ArticleSelectorComponent', () => {
  let component: ArticleSelectorComponent;
  let fixture: ComponentFixture<ArticleSelectorComponent>;

  const articles = [
    { id: 1, name: 'Article A', purchasePrice: 200, sellingPrice: 300, creditSalePrice: 350, stockQuantity: 10 },
    { id: 2, name: 'Article B', purchasePrice: 250, sellingPrice: 400, creditSalePrice: 450, stockQuantity: 5 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArticleSelectorComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: ItemService,
          useValue: {
            getEnabledArticlesPage: jasmine.createSpy('getEnabledArticlesPage').and.returnValue(of({ data: { content: [] } }))
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
});
