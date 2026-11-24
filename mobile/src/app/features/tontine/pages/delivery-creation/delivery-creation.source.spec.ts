import { DeliveryCreationPage } from './delivery-creation.page';

/** Filtre rapide stock / catalogue et réservation indicative (logique pure de la page). */
describe('DeliveryCreationPage article source and reservation', () => {
  function page(status: string | null): DeliveryCreationPage {
    const instance = Object.create(DeliveryCreationPage.prototype) as DeliveryCreationPage;
    (instance as any).vm = { session: status ? { id: 's1', status } : null };
    instance.articleSource = null;
    instance.reservedByArticle = new Map();
    (instance as any).refreshArticleSource = jasmine.createSpy('refreshArticleSource');
    return instance;
  }

  it('defaults to the catalogue while the session is open and to the stock once closed', () => {
    expect(page('ACTIVE').isCatalogueMode).toBeTrue();
    expect(page('CLOSED').isCatalogueMode).toBeFalse();
  });

  it('offers the stock / catalogue filter whenever an order is possible', () => {
    expect(page('ACTIVE').canChooseArticleSource).toBeTrue();
    expect(page('CLOSED').canChooseArticleSource).toBeTrue();
    expect(page('ENDED').canChooseArticleSource).toBeFalse();
  });

  it('lets the commercial pick his tontine stock for an order during the open session', () => {
    const instance = page('ACTIVE');

    instance.onArticleSourceChange({ detail: { value: 'STOCK' } });

    expect(instance.isCatalogueMode).toBeFalse();
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

  describe('pack selection', () => {
    function cartPage(): DeliveryCreationPage {
      const instance = page('ACTIVE');
      (instance as any).cart = new Map();
      (instance as any).cartDetails = new Map();
      (instance as any).offerSelection = new Map();
      (instance as any).vm = { projectedBudget: 100000, usedBudget: 0, remainingBudget: 0, selectedCount: 0 };
      instance.offersByArticle = new Map([
        ['7', [
          { mode: 'UNIT', label: 'Unité', unitsPerPack: 1, salePrice: 200 },
          { mode: 'PACK', label: 'Gros', unitsPerPack: 18, salePrice: 3300 }
        ]]
      ]);
      return instance;
    }
    const article = { id: '7', name: 'Bella', sellingPrice: 200 } as any;

    it('adds the selected pack, not the unit, to the cart', () => {
      const instance = cartPage();
      instance.onOfferChange('7', '7', 'PACK:18', 200, 'Bella', 1000000);

      instance.increaseCatalogueQuantity(article);

      expect(instance.vm.usedBudget).toBe(3300);
      expect(instance.cartLines[0].offer).toBe('Gros');
      expect(instance.cartLines[0].unitPrice).toBe(3300);
    });

    it('re-prices a line already in the cart when the offer changes', () => {
      const instance = cartPage();
      instance.increaseCatalogueQuantity(article);
      expect(instance.vm.usedBudget).toBe(200);

      instance.onOfferChange('7', '7', 'PACK:18', 200, 'Bella', 1000000);

      expect(instance.vm.usedBudget).toBe(3300);
      expect(instance.selectedOfferValue('7', '7', 200)).toBe('PACK:18');
    });

    it('caps the pack quantity to the stock available in packs', () => {
      const instance = cartPage();
      instance.onOfferChange('7', 's1', 'PACK:18', 200, 'Bella', 40, 's1');
      const stock = { id: 's1', articleId: '7', unitPrice: 200, availableQuantity: 40, articleName: 'Bella' } as any;

      instance.increaseQuantity(stock);
      instance.increaseQuantity(stock);
      instance.increaseQuantity(stock);

      expect(instance.getQuantity('s1')).toBe(2);
    });
  });
});
