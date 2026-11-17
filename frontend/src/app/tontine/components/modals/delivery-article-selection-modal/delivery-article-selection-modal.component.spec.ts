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

  it('concatenates commercialName and name with two spaces', () => {
    expect(component.formatArticleLabel(article({}))).toBe('HUILE AICHA 5L  REF-INT');
  });

  it('falls back to the remaining field when one is empty', () => {
    expect(component.formatArticleLabel(article({ commercialName: '' }))).toBe('REF-INT');
    expect(component.formatArticleLabel(article({ commercialName: undefined }))).toBe('REF-INT');
    expect(component.formatArticleLabel(article({ name: '' }))).toBe('HUILE AICHA 5L');
  });

  it('falls back to article id when both names are empty', () => {
    expect(component.formatArticleLabel(article({ commercialName: '', name: '' }))).toBe('Article #1');
  });
});
