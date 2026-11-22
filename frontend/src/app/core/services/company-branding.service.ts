import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  CompanyBranding,
  CompanyBrandingUpdatePayload,
  DEFAULT_COMPANY_BRANDING,
} from '@core/models/company-branding.model';
import { buildBrandCssVariables } from '@core/utils/color-palette.util';

interface CachedBrandingEntry {
  data: CompanyBranding;
  etag: string | null;
  cachedAt: number;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export const COMPANY_BRANDING_CACHE_KEY = 'elykia.company-branding.v1';
export const DEFAULT_LOGO_FALLBACK_URL = 'assets/images/logos/elykiaa.png';

@Injectable({
  providedIn: 'root',
})
export class CompanyBrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  private readonly publicBrandingUrl = `${environment.apiUrl}/api/public/company/branding`;
  private readonly adminCompanyUrl = `${environment.apiUrl}/api/v1/admin/company`;

  private readonly brandingState = signal<CompanyBranding>(DEFAULT_COMPANY_BRANDING);
  private readonly previewingState = signal<boolean>(false);
  private cachedEtag: string | null = null;
  private defaultFaviconHref: string | null = null;

  /** Read-only reactive branding state consumed by sidebar, login, and settings pages. */
  readonly branding = this.brandingState.asReadonly();
  readonly isPreviewing = this.previewingState.asReadonly();

  /** Absolute URL of the custom company logo (versioned for immutable caching), or null if default logo is used. */
  readonly customLogoUrl = computed<string | null>(() => {
    const current = this.brandingState();
    if (!current.hasLogo || !current.logoUrl) {
      return null;
    }
    return this.resolveAssetUrl(current.logoUrl);
  });

  /** Sidebar logo URL: custom logo when uploaded, otherwise the built-in ELYKIA logo. */
  readonly sidebarLogoUrl = computed<string>(() => {
    return this.customLogoUrl() ?? DEFAULT_LOGO_FALLBACK_URL;
  });

  readonly displayName = computed<string>(() => {
    const current = this.brandingState();
    return current.companyName || DEFAULT_COMPANY_BRANDING.companyName;
  });

  readonly shortName = computed<string>(() => {
    const current = this.brandingState();
    return current.shortName || current.companyName || 'ELYKIA';
  });

  readonly tagline = computed<string>(() => {
    const current = this.brandingState();
    return current.tagline || DEFAULT_COMPANY_BRANDING.tagline || '';
  });

  constructor() {
    this.captureDefaultFavicon();
    this.hydrateFromCache();
    this.applyToDocument(this.brandingState());
    this.registerCrossTabSync();
  }

  /**
   * Called during Angular bootstrap (`provideAppInitializer`).
   * Revalidates the cached branding against `/api/public/company/branding` using conditional ETag.
   * Never throws so the application always boots even when offline.
   */
  async init(): Promise<void> {
    try {
      let headers = new HttpHeaders();
      if (this.cachedEtag) {
        headers = headers.set('If-None-Match', this.cachedEtag);
      }

      const response = await firstValueFrom(
        this.http.get<CompanyBranding>(this.publicBrandingUrl, {
          headers,
          observe: 'response',
        }),
      );

      if (response.body) {
        const etag = response.headers.get('ETag') ?? `"company-v${response.body.themeVersion}"`;
        this.commitBranding(response.body, etag);
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 304) {
        // Cached branding is still up-to-date.
        return;
      }
      // Graceful fallback: keep cached or default branding.
    }
  }

  /** Forces a fresh fetch from the admin endpoint (bypasses browser ETag cache). */
  fetchAdminProfile(): Observable<CompanyBranding> {
    return this.http.get<ApiResponse<CompanyBranding>>(this.adminCompanyUrl).pipe(
      map((res) => res.data),
      tap((profile) => this.commitBranding(profile, `"company-v${profile.themeVersion}"`)),
    );
  }

  updateProfile(payload: CompanyBrandingUpdatePayload): Observable<CompanyBranding> {
    return this.http.put<ApiResponse<CompanyBranding>>(this.adminCompanyUrl, payload).pipe(
      map((res) => res.data),
      tap((profile) => this.commitBranding(profile, `"company-v${profile.themeVersion}"`)),
    );
  }

  uploadLogo(file: File): Observable<CompanyBranding> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<CompanyBranding>>(`${this.adminCompanyUrl}/logo`, formData).pipe(
      map((res) => res.data),
      tap((profile) => this.commitBranding(profile, `"company-v${profile.themeVersion}"`)),
    );
  }

  deleteLogo(): Observable<CompanyBranding> {
    return this.http.delete<ApiResponse<CompanyBranding>>(`${this.adminCompanyUrl}/logo`).pipe(
      map((res) => res.data),
      tap((profile) => this.commitBranding(profile, `"company-v${profile.themeVersion}"`)),
    );
  }

  resetTheme(): Observable<CompanyBranding> {
    return this.http.post<ApiResponse<CompanyBranding>>(`${this.adminCompanyUrl}/reset-theme`, {}).pipe(
      map((res) => res.data),
      tap((profile) => this.commitBranding(profile, `"company-v${profile.themeVersion}"`)),
    );
  }

  /**
   * Applies an ephemeral live preview of colors to the DOM without touching localStorage or persisted state.
   */
  preview(partial: Partial<CompanyBranding>): void {
    const merged: CompanyBranding = { ...this.brandingState(), ...partial };
    this.previewingState.set(true);
    this.applyCssVariables(merged);
  }

  /** Reverts any unsaved live preview back to the persisted branding state. */
  revertPreview(): void {
    if (!this.previewingState()) {
      return;
    }
    this.previewingState.set(false);
    this.applyToDocument(this.brandingState());
  }

  private commitBranding(profile: CompanyBranding, etag: string | null): void {
    const merged: CompanyBranding = {
      ...DEFAULT_COMPANY_BRANDING,
      ...profile,
    };
    this.cachedEtag = etag;
    this.previewingState.set(false);
    this.brandingState.set(merged);
    this.persistToCache(merged, etag);
    this.applyToDocument(merged);
  }

  private applyToDocument(profile: CompanyBranding): void {
    this.applyCssVariables(profile);
    this.applyDocumentTitle(profile);
    this.applyFavicon(profile);
  }

  private applyCssVariables(profile: CompanyBranding): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }
    const cssVars = buildBrandCssVariables(profile);
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
  }

  private applyDocumentTitle(profile: CompanyBranding): void {
    if (!this.document) {
      return;
    }
    const title = profile.shortName?.trim() || profile.companyName?.trim() || 'Elykia';
    this.document.title = title;
  }

  private applyFavicon(profile: CompanyBranding): void {
    if (!this.document?.head) {
      return;
    }
    const link = this.document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
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
      const raw = localStorage.getItem(COMPANY_BRANDING_CACHE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<CachedBrandingEntry>;
      if (parsed?.data && typeof parsed.data.companyName === 'string') {
        this.brandingState.set({
          ...DEFAULT_COMPANY_BRANDING,
          ...parsed.data,
        });
        this.cachedEtag = typeof parsed.etag === 'string' ? parsed.etag : null;
      }
    } catch {
      // Ignore corrupted cache entry and fall back to defaults.
    }
  }

  private persistToCache(data: CompanyBranding, etag: string | null): void {
    try {
      const entry: CachedBrandingEntry = {
        data,
        etag,
        cachedAt: Date.now(),
      };
      localStorage.setItem(COMPANY_BRANDING_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Storage quota or private mode; in-memory state still works.
    }
  }

  private registerCrossTabSync(): void {
    const win = this.document?.defaultView;
    if (!win?.addEventListener) {
      return;
    }
    win.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== COMPANY_BRANDING_CACHE_KEY || !event.newValue) {
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as Partial<CachedBrandingEntry>;
        if (parsed?.data) {
          this.cachedEtag = typeof parsed.etag === 'string' ? parsed.etag : null;
          this.previewingState.set(false);
          const merged = { ...DEFAULT_COMPANY_BRANDING, ...parsed.data };
          this.brandingState.set(merged);
          this.applyToDocument(merged);
        }
      } catch {
        // Ignore invalid cross-tab payload.
      }
    });
  }
}
