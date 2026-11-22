import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerCompanyBranding,
  DEFAULT_CUSTOMER_COMPANY_BRANDING,
  buildCustomerBrandCssVariables,
} from '../utils/customer-branding-palette';

interface CachedCustomerBranding {
  data: CustomerCompanyBranding;
  etag: string | null;
  cachedAt: number;
}

export const CUSTOMER_BRANDING_CACHE_KEY = 'elykia_customer_company_branding_v1';

@Injectable({
  providedIn: 'root',
})
export class CustomerBrandingService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly document = inject(DOCUMENT);

  private readonly brandingEndpoint = `${environment.apiUrl.replace(/\/+$/, '')}/api/public/company/branding`;
  private readonly state = signal<CustomerCompanyBranding>(DEFAULT_CUSTOMER_COMPANY_BRANDING);
  private cachedEtag: string | null = null;
  private defaultFaviconHref: string | null = null;

  readonly branding = this.state.asReadonly();

  readonly displayName = computed<string>(() => {
    const name = this.state().companyName?.trim();
    return name || DEFAULT_CUSTOMER_COMPANY_BRANDING.companyName;
  });

  readonly shortName = computed<string>(() => {
    const short = this.state().shortName?.trim();
    return short || 'Elykia';
  });

  readonly customLogoUrl = computed<string | null>(() => {
    const current = this.state();
    if (!current.hasLogo || !current.logoUrl) {
      return null;
    }
    return this.resolveAssetUrl(current.logoUrl);
  });

  constructor() {
    this.captureDefaultFavicon();
    this.hydrateFromCache();
    this.applyToDocument(this.state());
    this.registerCrossTabSync();
  }

  /**
   * Revalidates enterprise branding during APP_INITIALIZER using HTTP ETag conditional requests.
   * Never rejects so offline/mobile cold-start always succeeds with cached or default branding.
   */
  async init(): Promise<void> {
    if (!this.http) {
      return;
    }
    try {
      let headers = new HttpHeaders();
      if (this.cachedEtag) {
        headers = headers.set('If-None-Match', this.cachedEtag);
      }

      const response = await firstValueFrom(
        this.http.get<CustomerCompanyBranding>(this.brandingEndpoint, {
          headers,
          observe: 'response',
        }),
      );

      if (response.body) {
        const etag = response.headers.get('ETag') ?? `"company-v${response.body.themeVersion}"`;
        this.commit(response.body, etag);
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 304) {
        return;
      }
      // Graceful fallback: retain cached or default branding.
    }
  }

  private commit(profile: CustomerCompanyBranding, etag: string | null): void {
    const merged: CustomerCompanyBranding = {
      ...DEFAULT_CUSTOMER_COMPANY_BRANDING,
      ...profile,
    };
    this.cachedEtag = etag;
    this.state.set(merged);
    this.persistToCache(merged, etag);
    this.applyToDocument(merged);
  }

  private applyToDocument(profile: CustomerCompanyBranding): void {
    const root = this.document?.documentElement;
    if (root) {
      const vars = buildCustomerBrandCssVariables(profile);
      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
      }
    }

    if (this.document) {
      const label = profile.shortName?.trim() || profile.companyName?.trim() || 'ELYKIA';
      this.document.title = `${label} — Espace Client`;
    }

    this.applyFavicon(profile);
  }

  private applyFavicon(profile: CustomerCompanyBranding): void {
    const link = this.document?.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      return;
    }
    if (profile.hasLogo && profile.logoUrl) {
      link.href = this.resolveAssetUrl(profile.logoUrl);
    } else if (this.defaultFaviconHref) {
      link.href = this.defaultFaviconHref;
    }
  }

  private captureDefaultFavicon(): void {
    const link = this.document?.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (link) {
      this.defaultFaviconHref = link.getAttribute('href');
    }
  }

  private resolveAssetUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = (environment.apiUrl || '').replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  private hydrateFromCache(): void {
    try {
      const raw = localStorage.getItem(CUSTOMER_BRANDING_CACHE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<CachedCustomerBranding>;
      if (parsed?.data && typeof parsed.data.companyName === 'string') {
        this.state.set({
          ...DEFAULT_CUSTOMER_COMPANY_BRANDING,
          ...parsed.data,
        });
        this.cachedEtag = typeof parsed.etag === 'string' ? parsed.etag : null;
      }
    } catch {
      // Ignore malformed cache payload.
    }
  }

  private persistToCache(data: CustomerCompanyBranding, etag: string | null): void {
    try {
      const entry: CachedCustomerBranding = {
        data,
        etag,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CUSTOMER_BRANDING_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore storage quota / private mode errors.
    }
  }

  private registerCrossTabSync(): void {
    const win = this.document?.defaultView;
    if (!win?.addEventListener) {
      return;
    }
    win.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== CUSTOMER_BRANDING_CACHE_KEY || !event.newValue) {
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as Partial<CachedCustomerBranding>;
        if (parsed?.data) {
          this.cachedEtag = typeof parsed.etag === 'string' ? parsed.etag : null;
          const merged = { ...DEFAULT_CUSTOMER_COMPANY_BRANDING, ...parsed.data };
          this.state.set(merged);
          this.applyToDocument(merged);
        }
      } catch {
        // Ignore invalid cross-tab payload.
      }
    });
  }
}
