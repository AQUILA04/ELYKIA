import { RUNTIME_API_URL_PLACEHOLDER, resolveRuntimeApiUrl } from './runtime-env';

type RuntimeWindow = typeof globalThis & { __CUSTOMER_SPACE_ENV__?: { apiUrl?: string } };

describe('resolveRuntimeApiUrl', () => {
  const fallback = 'https://elykia.amenouveve-yaveh.com/api';
  const runtime = globalThis as RuntimeWindow;
  let previous: RuntimeWindow['__CUSTOMER_SPACE_ENV__'];

  beforeEach(() => {
    previous = runtime.__CUSTOMER_SPACE_ENV__;
  });

  afterEach(() => {
    runtime.__CUSTOMER_SPACE_ENV__ = previous;
  });

  it('returns fallback when env.js is absent', () => {
    delete runtime.__CUSTOMER_SPACE_ENV__;
    expect(resolveRuntimeApiUrl(fallback)).toBe(fallback);
  });

  it('returns fallback when placeholder was not replaced', () => {
    runtime.__CUSTOMER_SPACE_ENV__ = { apiUrl: RUNTIME_API_URL_PLACEHOLDER };
    expect(resolveRuntimeApiUrl(fallback)).toBe(fallback);
  });

  it('returns fallback when value is empty', () => {
    runtime.__CUSTOMER_SPACE_ENV__ = { apiUrl: '  ' };
    expect(resolveRuntimeApiUrl(fallback)).toBe(fallback);
  });

  it('returns runtime value without trailing slash', () => {
    runtime.__CUSTOMER_SPACE_ENV__ = { apiUrl: 'https://elykia-test.amenouveve-yaveh.com/api/' };
    expect(resolveRuntimeApiUrl(fallback)).toBe('https://elykia-test.amenouveve-yaveh.com/api');
  });
});
