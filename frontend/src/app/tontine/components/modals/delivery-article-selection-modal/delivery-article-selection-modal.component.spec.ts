import { DeliveryArticleSelectionModalComponent } from './delivery-article-selection-modal.component';
import { Article as CatalogArticle } from 'src/app/article/service/item.service';

describe('DeliveryArticleSelectionModalComponent article labels', () => {
  const component = Object.create(DeliveryArticleSelectionModalComponent.prototype) as DeliveryArticleSelectionModalComponent;

  const article = (partial: Partial<CatalogArticle>): CatalogArticle =>
    ({
      id: 1,
      name: 'REF-INT',
      commercialName: 'HUILE AICHA 5L',
      marque: 'Aicha',
      type: 'Huile',
      purchasePrice: 1000,
      sellingPrice: 1500,
      ...partial,
    }) as CatalogArticle;

  it('prefers commercialName as primary label', () => {
    expect(component.formatArticleLabel(article({}))).toBe('HUILE AICHA 5L');
  });

  it('falls back to name when commercialName is empty', () => {
    expect(component.formatArticleLabel(article({ commercialName: '' }))).toBe('REF-INT');
    expect(component.formatArticleLabel(article({ commercialName: undefined }))).toBe('REF-INT');
  });

  it('shows name as subtitle when distinct from commercialName', () => {
    expect(component.formatArticleSubtitle(article({}))).toBe('REF-INT');
    expect(component.formatArticleSubtitle(article({ name: 'HUILE AICHA 5L' }))).toBeNull();
    expect(component.formatArticleSubtitle(article({ commercialName: '' }))).toBeNull();
  });
});
