import { STOCK_SHEET_TOUR, STOCK_TEAM_TOUR } from './stock-tours';

describe('stock tours', () => {
  it('ships tours with unique targets and ids distinct from the report tours', () => {
    expect(STOCK_TEAM_TOUR.id).not.toBe(STOCK_SHEET_TOUR.id);
    for (const definition of [STOCK_TEAM_TOUR, STOCK_SHEET_TOUR]) {
      expect(definition.steps.length).toBeGreaterThan(2);
      const targets = definition.steps.map(step => step.target).filter(Boolean);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });
});
