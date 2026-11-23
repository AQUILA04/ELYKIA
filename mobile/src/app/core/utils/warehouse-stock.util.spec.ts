import { warehouseStockLabel } from './warehouse-stock.util';

describe('warehouseStockLabel', () => {
  const now = new Date(2026, 10, 23, 15, 0);

  it('signale un stock jamais lu', () => {
    expect(warehouseStockLabel(null, null, now)).toBe('Stock magasin : non connu');
    expect(warehouseStockLabel(undefined, undefined, now)).toBe('Stock magasin : non connu');
  });

  it("affiche l'heure de lecture du jour", () => {
    const label = warehouseStockLabel(12, new Date(2026, 10, 23, 9, 5).toISOString(), now);
    expect(label).toContain('Stock magasin : 12');
    expect(label).toContain('lu à');
  });

  it('affiche la date quand la lecture date d\'un autre jour', () => {
    const label = warehouseStockLabel(0, new Date(2026, 10, 20, 9, 5).toISOString(), now);
    expect(label).toContain('Stock magasin : 0');
    expect(label).toContain('lu le');
  });
});
