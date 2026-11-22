import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanySettingsPageComponent } from './company-settings-page.component';
import {
  BRAND_THEME_PRESETS,
  CompanyBranding,
  DEFAULT_COMPANY_BRANDING,
} from '@core/models/company-branding.model';
import { COMPANY_BRANDING_CACHE_KEY } from '@core/services/company-branding.service';
import { AlertService } from '@shared/service/alert.service';
import { environment } from '@env/environment';

describe('CompanySettingsPageComponent', () => {
  let fixture: ComponentFixture<CompanySettingsPageComponent>;
  let component: CompanySettingsPageComponent;
  let httpMock: HttpTestingController;
  let alertServiceSpy: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
    showWarning: ReturnType<typeof vi.fn>;
    showConfirmation: ReturnType<typeof vi.fn>;
  };

  const apiUrl = `${environment.apiUrl}/api/v1/admin/company`;

  beforeEach(async () => {
    localStorage.removeItem(COMPANY_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');

    alertServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      showConfirmation: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [CompanySettingsPageComponent],
      providers: [{ provide: AlertService, useValue: alertServiceSpy }],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CompanySettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const initReq = httpMock.expectOne(apiUrl);
    initReq.flush({ data: DEFAULT_COMPANY_BRANDING });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(COMPANY_BRANDING_CACHE_KEY);
    document.documentElement.removeAttribute('style');
  });

  it('creates the page and populates the reactive form from admin profile', () => {
    expect(component).toBeTruthy();
    expect(component.form.get('companyName')?.value).toBe('AMENOUVEVE-YAVEH');
    expect(component.form.get('primaryColor')?.value).toBe('#003366');
  });

  it('applies a preset for live preview and reverts on cancelPreview', () => {
    const emerald = BRAND_THEME_PRESETS.find((p) => p.id === 'emerald-corporate')!;
    component.applyPreset(emerald);

    expect(component.isPreviewing()).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#065f46');

    component.cancelPreview();
    expect(component.isPreviewing()).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#003366');
  });

  it('saves updated company identity and color chart via PUT /api/v1/admin/company', () => {
    component.form.patchValue({
      companyName: 'Société Nouvelle SA',
      shortName: 'SNSA',
      primaryColor: '#1e3a8a',
    });

    component.onSave();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.companyName).toBe('Société Nouvelle SA');
    expect(req.request.body.primaryColor).toBe('#1e3a8a');

    const updated: CompanyBranding = {
      ...DEFAULT_COMPANY_BRANDING,
      companyName: 'Société Nouvelle SA',
      shortName: 'SNSA',
      primaryColor: '#1e3a8a',
      themeVersion: 2,
    };
    req.flush({ data: updated });

    expect(component.branding().themeVersion).toBe(2);
    expect(alertServiceSpy.showSuccess).toHaveBeenCalled();
  });
});
