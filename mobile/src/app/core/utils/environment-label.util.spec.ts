import { resolveEnvironmentLabel } from './environment-label.util';

describe('resolveEnvironmentLabel (mobile)', () => {
  it('hides production', () => {
    expect(resolveEnvironmentLabel({ envName: 'prod' })).toBeNull();
    expect(resolveEnvironmentLabel({
      envName: 'prod',
      apiUrl: 'https://elykia.amenouveve-yaveh.com/api'
    })).toBeNull();
  });

  it('shows TEST from envName or apiUrl', () => {
    expect(resolveEnvironmentLabel({ envName: 'test' })).toBe('TEST');
    expect(resolveEnvironmentLabel({
      apiUrl: 'https://elykia-test.amenouveve-yaveh.com/api'
    })).toBe('TEST');
  });

  it('shows DEV for local apiUrl', () => {
    expect(resolveEnvironmentLabel({
      envName: 'Dev',
      apiUrl: 'http://192.168.1.72:8081'
    })).toBe('DEV');
  });
});
