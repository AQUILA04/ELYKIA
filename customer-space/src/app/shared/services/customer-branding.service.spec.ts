import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  CUSTOMER_BRANDING_CACHE_KEY,
  CustomerBrandingService,
} from './customer-branding.service';
import {
  CustomerCompanyBranding,
  DEFAULT_CUSTOMER_COMPANY_BRANDING,
} from '../utils/customer-branding-palette';
import { environment } from '../../../environments/environment';

describe('CustomerBrandingService', () => {
  let service: CustomerBrandingService;
  let httpMock: HttpTestingController;

  const endpoint = `${environment.apiUrl.replace(/\/+$/, '')}/api/public/company/branding`;

  const customBranding: CustomerCompanyBranding = {
    ...DEFAULT_CUSTOMER_COMPANY_BRANDING,
    companyName: 'SOLEIL MICROFINANCE',
    shortName: 'Soleil',
    primaryColor: '#065f46',
    secondaryColor: '#0d9488',
    accentColor: '#f59e0b',
    hasLogo: true,
    logoFilename: 'soleil.png',
    logoUrl: '/api/public/company/logo?v=4',
    themeVersion: 4,
  };

  beforeEach(() => {
    localStorage.removeItem(CUSTOMER_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(CUSTOMER_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');
  });

  it('hydrates immediately from localStorage cache and applies --elyk-* tokens', () => {
    localStorage.setItem(
      CUSTOMER_BRANDING_CACHE_KEY,
      JSON.stringify({ data: customBranding, etag: '"company-v4"', cachedAt: Date.now() }),
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CustomerBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    expect(service.displayName()).toBe('SOLEIL MICROFINANCE');
    expect(service.shortName()).toBe('Soleil');
    expect(service.customLogoUrl()).toBe(`${environment.apiUrl.replace(/\/+$/, '')}/api/public/company/logo?v=4`);
    expect(document.documentElement.style.getPropertyValue('--elyk-navy-mid')).toBe('#065f46');
    expect(document.documentElement.style.getPropertyValue('--elyk-gold')).toBe('#f59e0b');
    expect(document.title).toBe('Soleil — Espace Client');
  });

  it('fetches public branding on init and caches response with ETag', async () => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CustomerBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    const promise = service.init();
    const req = httpMock.expectOne(endpoint);
    expect(req.request.method).toBe('GET');
    req.flush(customBranding, { headers: { ETag: '"company-v4"' } });

    await promise;
    expect(service.displayName()).toBe('SOLEIL MICROFINANCE');
    const cached = JSON.parse(localStorage.getItem(CUSTOMER_BRANDING_CACHE_KEY) || '{}');
    expect(cached.etag).toBe('"company-v4"');
  });

  it('handles 304 Not Modified gracefully when ETag matches', async () => {
    localStorage.setItem(
      CUSTOMER_BRANDING_CACHE_KEY,
      JSON.stringify({ data: customBranding, etag: '"company-v4"', cachedAt: Date.now() }),
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CustomerBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    const promise = service.init();
    const req = httpMock.expectOne(endpoint);
    expect(req.request.headers.get('If-None-Match')).toBe('"company-v4"');
    req.flush(null, { status: 304, statusText: 'Not Modified' });

    await promise;
    expect(service.branding().themeVersion).toBe(4);
  });
});
