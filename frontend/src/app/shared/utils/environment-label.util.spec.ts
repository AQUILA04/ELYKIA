import { resolveEnvironmentLabel } from './environment-label.util';

describe('resolveEnvironmentLabel', () => {
  it('hides production labels', () => {
    expect(resolveEnvironmentLabel({ envName: 'prod' })).toBeNull();
    expect(resolveEnvironmentLabel({ envName: 'production' })).toBeNull();
  });

  it('maps known non-prod labels', () => {
    expect(resolveEnvironmentLabel({ envName: 'test' })).toBe('TEST');
    expect(resolveEnvironmentLabel({ envName: 'Dev' })).toBe('DEV');
    expect(resolveEnvironmentLabel({ envName: 'formation' })).toBe('FORMATION');
  });

  it('infers TEST from hostname or apiUrl', () => {
    expect(resolveEnvironmentLabel({
      hostname: 'elykia-test.amenouveve-yaveh.com',
      apiUrl: 'https://elykia-test.amenouveve-yaveh.com/api'
    })).toBe('TEST');
  });

  it('infers DEV from localhost', () => {
    expect(resolveEnvironmentLabel({
      hostname: 'localhost',
      apiUrl: 'http://localhost:8081'
    })).toBe('DEV');
  });

  it('hides prod hostname without envName', () => {
    expect(resolveEnvironmentLabel({
      hostname: 'elykia.amenouveve-yaveh.com',
      apiUrl: 'https://elykia.amenouveve-yaveh.com/api'
    })).toBeNull();
  });
});
