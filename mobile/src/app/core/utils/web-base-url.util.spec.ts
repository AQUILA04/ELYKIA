import { getWebBaseUrl } from './web-base-url.util';

describe('getWebBaseUrl', () => {
  it('returns apiUrl unchanged when no /api suffix', () => {
    expect(getWebBaseUrl('https://elykia.example.com')).toBe('https://elykia.example.com');
  });

  it('strips trailing /api', () => {
    expect(getWebBaseUrl('https://elykia.example.com/api')).toBe('https://elykia.example.com');
  });

  it('strips trailing slashes then /api', () => {
    expect(getWebBaseUrl('https://elykia.example.com/api/')).toBe('https://elykia.example.com');
  });

  it('maps localhost Spring port 8081 to Angular 4200', () => {
    expect(getWebBaseUrl('http://localhost:8081')).toBe('http://localhost:4200');
  });

  it('maps localhost:8081/api to Angular 4200', () => {
    expect(getWebBaseUrl('http://localhost:8081/api')).toBe('http://localhost:4200');
  });

  it('maps 127.0.0.1:8081 to Angular 4200', () => {
    expect(getWebBaseUrl('http://127.0.0.1:8081')).toBe('http://127.0.0.1:4200');
  });

  it('does not change non-localhost API hosts on port 8081', () => {
    expect(getWebBaseUrl('http://192.168.1.72:8081')).toBe('http://192.168.1.72:8081');
  });
});
