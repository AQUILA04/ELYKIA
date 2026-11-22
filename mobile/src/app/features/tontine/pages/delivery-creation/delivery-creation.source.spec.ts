import { DeliveryCreationPage } from './delivery-creation.page';

/** Filtre rapide stock / catalogue et réservation indicative (logique pure de la page). */
describe('DeliveryCreationPage article source and reservation', () => {
    function page(status: string | null): DeliveryCreationPage {
        const instance = Object.create(DeliveryCreationPage.prototype) as DeliveryCreationPage;
        (instance as any).vm = { session: status ? { id: 's1', status } : null };
        instance.articleSource = null;
        instance.reservedByArticle = new Map();
        (instance as any).refreshArticleSource = vi.fn();
        return instance;
    }

    it('defaults to the catalogue while the session is open and to the stock once closed', () => {
        expect(page('ACTIVE').isCatalogueMode).toBe(true);
        expect(page('CLOSED').isCatalogueMode).toBe(false);
    });

    it('offers the stock / catalogue filter whenever an order is possible', () => {
        expect(page('ACTIVE').canChooseArticleSource).toBe(true);
        expect(page('CLOSED').canChooseArticleSource).toBe(true);
        expect(page('ENDED').canChooseArticleSource).toBe(false);
    });

    it('lets the commercial pick his tontine stock for an order during the open session', () => {
        const instance = page('ACTIVE');

        instance.onArticleSourceChange({ detail: { value: 'STOCK' } });

        expect(instance.isCatalogueMode).toBe(false);
        expect(instance.effectiveArticleSource).toBe('STOCK');
        expect((instance as any).refreshArticleSource).toHaveBeenCalledTimes(1);

        instance.onArticleSourceChange({ detail: { value: 'STOCK' } });
        expect((instance as any).refreshArticleSource).toHaveBeenCalledTimes(1);
    });

    it('shows reserved and free quantities without going below zero', () => {
        const instance = page('ACTIVE');
        instance.reservedByArticle = new Map([['11', 3], ['12', 9]]);

        expect(instance.reservedFor({ articleId: '11', availableQuantity: 5 } as any)).toBe(3);
        expect(instance.freeFor({ articleId: '11', availableQuantity: 5 } as any)).toBe(2);
        expect(instance.freeFor({ articleId: '12', availableQuantity: 5 } as any)).toBe(0);
        expect(instance.reservedFor({ articleId: '13', availableQuantity: 5 } as any)).toBe(0);
    });
});
