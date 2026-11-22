import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COMPANY_BRANDING_CACHE_KEY,
  CompanyBrandingService,
  DEFAULT_LOGO_FALLBACK_URL,
} from './company-branding.service';
import { CompanyBranding, DEFAULT_COMPANY_BRANDING } from '@core/models/company-branding.model';
import { environment } from '@env/environment';

describe('CompanyBrandingService', () => {
  let service: CompanyBrandingService;
  let httpMock: HttpTestingController;

  const sampleProfile: CompanyBranding = {
    ...DEFAULT_COMPANY_BRANDING,
    companyName: 'Banque Atlantique Demo',
    shortName: 'BADEMO',
    tagline: 'Votre partenaire au quotidien',
    primaryColor: '#065f46',
    secondaryColor: '#0d9488',
    accentColor: '#f59e0b',
    sidebarBgColor: '#042f2e',
    sidebarTextColor: '#e2f1ed',
    backgroundColor: '#f1f7f5',
    hasLogo: true,
    logoFilename: 'logo.png',
    logoUrl: '/api/public/company/logo?v=5',
    themeVersion: 5,
  };

  beforeEach(() => {
    localStorage.removeItem(COMPANY_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.removeItem(COMPANY_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');
  });

  it('hydrates immediately from localStorage cache before HTTP revalidation', () => {
    localStorage.setItem(
      COMPANY_BRANDING_CACHE_KEY,
      JSON.stringify({
        data: sampleProfile,
        etag: '"company-v5"',
        cachedAt: Date.now(),
      }),
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(CompanyBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    expect(service.displayName()).toBe('Banque Atlantique Demo');
    expect(service.sidebarLogoUrl()).toBe(`${environment.apiUrl}/api/public/company/logo?v=5`);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#065f46');
    expect(document.title).toBe('BADEMO');
  });

  it('revalidates with If-None-Match on init and handles 304 gracefully', async () => {
    localStorage.setItem(
      COMPANY_BRANDING_CACHE_KEY,
      JSON.stringify({
        data: sampleProfile,
        etag: '"company-v5"',
        cachedAt: Date.now(),
      }),
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(CompanyBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    const initPromise = service.init();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/public/company/branding`);
    expect(req.request.headers.get('If-None-Match')).toBe('"company-v5"');
    req.flush(null, { status: 304, statusText: 'Not Modified' });

    await initPromise;
    expect(service.branding().themeVersion).toBe(5);
  });

  it('applies live preview and reverts cleanly to persisted state', () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompanyBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    expect(service.sidebarLogoUrl()).toBe(DEFAULT_LOGO_FALLBACK_URL);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#003366');

    service.preview({ primaryColor: '#7f1d1d' });
    expect(service.isPreviewing()).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#7f1d1d');

    service.revertPreview();
    expect(service.isPreviewing()).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#003366');
  });

  it('updates cache and DOM tokens when saving profile via admin API', () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompanyBrandingService);
    httpMock = TestBed.inject(HttpTestingController);

    let saved: CompanyBranding | undefined;
    service
      .updateProfile({
        companyName: sampleProfile.companyName,
        shortName: sampleProfile.shortName,
        tagline: sampleProfile.tagline,
        address: null,
        phone: null,
        email: null,
        website: null,
        taxId: null,
        primaryColor: sampleProfile.primaryColor,
        secondaryColor: sampleProfile.secondaryColor,
        accentColor: sampleProfile.accentColor,
        sidebarBgColor: sampleProfile.sidebarBgColor,
        sidebarTextColor: sampleProfile.sidebarTextColor,
        backgroundColor: sampleProfile.backgroundColor,
      })
      .subscribe((res) => (saved = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/company`);
    expect(req.request.method).toBe('PUT');
    req.flush({ data: sampleProfile });

    expect(saved?.themeVersion).toBe(5);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#065f46');
    const persisted = JSON.parse(localStorage.getItem(COMPANY_BRANDING_CACHE_KEY) || '{}');
    expect(persisted.etag).toBe('"company-v5"');
  });
});
