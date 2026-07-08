import { articleDisplayName } from './article-display';

describe('articleDisplayName', () => {
  it('prefers displayName from API', () => {
    expect(articleDisplayName({
      displayName: 'HUILE: Aromate 1L Huile',
      commercialName: 'ignored',
      name: 'ignored',
    })).toBe('HUILE: Aromate 1L Huile');
  });

  it('concatenates commercialName and name', () => {
    expect(articleDisplayName({
      commercialName: 'RIZ: Bonita 1Kg',
      name: 'Sac 1Kg',
    })).toBe('RIZ: Bonita 1Kg Sac 1Kg');
  });
});
