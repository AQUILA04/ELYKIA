import { DeliveryArticleSelectionModalComponent, buildStockArticleRows } from './delivery-article-selection-modal.component';
import { Article as CatalogArticle } from 'src/app/article/service/item.service';

describe('DeliveryArticleSelectionModalComponent article labels', () => {
    const component = Object.create(DeliveryArticleSelectionModalComponent.prototype) as DeliveryArticleSelectionModalComponent;

    const article = (partial: Partial<CatalogArticle>): CatalogArticle => ({
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

describe('buildStockArticleRows', () => {
    it('shows available, reserved and free quantities, never below zero', () => {
        const rows = buildStockArticleRows([
            { articleId: 2, articleName: 'Riz 25 kg', unitPrice: 15000, availableQuantity: 5 },
            { articleId: 1, articleName: 'Huile 5 L', unitPrice: 6000, availableQuantity: 2 },
            { articleId: 3, articleName: 'Sucre', unitPrice: 1000, availableQuantity: 0 }
        ], [
            { articleId: 2, reservedQuantity: 3, orderCount: 2 },
            { articleId: 1, reservedQuantity: 4, orderCount: 1 }
        ]);

        expect(rows.map(row => row.articleName)).toEqual(['Huile 5 L', 'Riz 25 kg']);
        expect(rows[0]).toEqual(expect.objectContaining({ available: 2, reserved: 4, free: 0 }));
        expect(rows[1]).toEqual(expect.objectContaining({ available: 5, reserved: 3, free: 2 }));
    });

    it('reads the stock from a paged response', () => {
        const rows = buildStockArticleRows({ data: { content: [{ articleId: 1, articleName: 'Riz', unitPrice: 1, availableQuantity: 1 }] } }, []);

        expect(rows.length).toBe(1);
        expect(rows[0].reserved).toBe(0);
    });
});
