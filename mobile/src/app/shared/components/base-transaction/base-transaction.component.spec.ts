import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BaseTransactionComponent } from './base-transaction.component';
import { Article } from '../../../models/article.model';

describe('BaseTransactionComponent', () => {
  let component: BaseTransactionComponent;
  let fixture: ComponentFixture<BaseTransactionComponent>;

  const articleA = {
    id: 'a1',
    name: 'Article A',
    commercialName: 'Art A',
    creditSalePrice: 1000,
    stockQuantity: 10
  } as Article;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BaseTransactionComponent],
      imports: [IonicModule.forRoot(), ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTransactionComponent);
    component = fixture.componentInstance;
    component.config = {
      type: 'ORDER',
      checkStock: false,
      updateStock: false,
      showStockInfo: false,
      maxQuantityCheck: false,
      requiresAdvance: false,
      calculateDailyPayment: false,
      title: 'Nouvelle Commande',
      submitButtonText: 'Valider',
      backRoute: '/tabs/orders'
    };
    component.availableArticles = [articleA];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reset clears client-bound quantities, total and search', () => {
    component.increaseQuantity(articleA);
    component.increaseQuantity(articleA);
    component.searchTerm = 'congelateur';
    component.onSearchInput({ target: { value: 'congelateur' } });

    expect(component.getArticleQuantity(articleA.id)).toBe(2);
    expect(component.totalAmount).toBe(2000);
    expect(component.hasSelectedArticles()).toBeTrue();

    component.reset();

    expect(component.getArticleQuantity(articleA.id)).toBe(0);
    expect(component.totalAmount).toBe(0);
    expect(component.searchTerm).toBe('');
    expect(component.hasSelectedArticles()).toBeFalse();
    expect(component.canValidate()).toBeFalse();
  });
});
