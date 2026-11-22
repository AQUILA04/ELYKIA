import {
  computeTontineOrderCeiling,
  formatFcfa,
  tontineCeilingExceededMessage,
  tontineCeilingExcess
} from './tontine-order-ceiling.util';
import { addTontineLinePick, tontineQuantitiesByArticle } from './tontine-delivery-item-quantity.util';
import { TontineDeliveryItem } from '../../models/tontine.model';

describe('tontine order ceiling', () => {
  it('takes the greater of the projected balance and the net balance', () => {
    expect(computeTontineOrderCeiling(20000, 25500).ceiling).toBe(25500);
    expect(computeTontineOrderCeiling(60000, 25500).ceiling).toBe(60000);
    expect(computeTontineOrderCeiling(null, undefined).ceiling).toBe(0);
  });

  it('measures the excess with the server tolerance', () => {
    expect(tontineCeilingExcess(62300, 25500)).toBe(36800);
    expect(tontineCeilingExcess(25500.0005, 25500)).toBe(0);
    expect(tontineCeilingExcess(1000, 25500)).toBe(0);
  });

  it('formats amounts the French way and gives the same message as the server', () => {
    expect(formatFcfa(12800)).toBe('12 800 FCFA');
    expect(formatFcfa(1234567)).toBe('1 234 567 FCFA');
    expect(tontineCeilingExceededMessage(62300, 25500)).toBe(
      'La commande (62 300 FCFA) dépasse le plafond de ce membre (25 500 FCFA) de 36 800 FCFA. '
      + 'Le plafond est le plus grand du solde prévisionnel et du solde net cotisé. Réduisez la commande.');
  });
});

describe('addTontineLinePick', () => {
  const line = (overrides: Partial<TontineDeliveryItem> = {}): TontineDeliveryItem => ({
    id: 'i1', tontineDeliveryId: 'd1', articleId: 'a1', quantity: 2, unitPrice: 3200, totalPrice: 6400, ...overrides
  });

  it('adds one unit to the existing unit line of the same article', () => {
    const lines = [line()];
    const next = addTontineLinePick(lines, { articleId: 'a1', articleName: 'Riz', unitPrice: 3200 }, 'd1');

    expect(next.length).toBe(1);
    expect(next[0].quantity).toBe(3);
    expect(next[0].totalPrice).toBe(9600);
    expect(lines[0].quantity).toBe(2);
  });

  it('creates a new line for a new article, or next to a pack line of the same article', () => {
    const packLine = line({ salePackMode: 'PACK', packCount: 1, unitsPerPack: 5, quantity: 5, totalPrice: 15000 });
    const next = addTontineLinePick([packLine], { articleId: 'a1', articleName: 'Riz', unitPrice: 3200 }, 'd1', () => 'new');

    expect(next.length).toBe(2);
    expect(next[1]).toEqual(jasmine.objectContaining({ id: 'new', articleId: 'a1', quantity: 1, totalPrice: 3200, salePackMode: 'UNIT' }));
    expect(tontineQuantitiesByArticle(next)).toEqual({ a1: 6 });
  });
});
