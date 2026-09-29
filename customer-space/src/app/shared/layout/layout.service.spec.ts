import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';
import { Capacitor } from '@capacitor/core';

describe('LayoutService', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let listeners: Array<(e: MediaQueryListEvent) => void>;
  let matches: boolean;

  beforeEach(() => {
    listeners = [];
    matches = false;
    originalMatchMedia = window.matchMedia;
    spyOn(Capacitor, 'getPlatform').and.returnValue('web');
    window.matchMedia = ((query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners.push(cb);
        },
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.classList.remove('elyk-desktop', 'elyk-web');
  });

  it('isDesktop is false when viewport is below 1024px on web', () => {
    matches = false;
    const service = TestBed.inject(LayoutService);
    expect(service.isDesktop()).toBeFalse();
    expect(document.body.classList.contains('elyk-web')).toBeTrue();
    expect(document.body.classList.contains('elyk-desktop')).toBeFalse();
  });

  it('isDesktop is true when viewport is ≥ 1024px on web', () => {
    matches = true;
    const service = TestBed.inject(LayoutService);
    expect(service.isDesktop()).toBeTrue();
    expect(document.body.classList.contains('elyk-desktop')).toBeTrue();
  });

  it('updates isDesktop when media query changes', () => {
    matches = false;
    const service = TestBed.inject(LayoutService);
    expect(service.isDesktop()).toBeFalse();
    matches = true;
    listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent));
    expect(service.isDesktop()).toBeTrue();
  });
});

describe('LayoutService native', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.classList.remove('elyk-desktop', 'elyk-web');
  });

  it('never activates desktop on native platform even at wide viewport', () => {
    const service = TestBed.inject(LayoutService);
    expect(service.isDesktop()).toBeFalse();
    expect(document.body.classList.contains('elyk-desktop')).toBeFalse();
  });
});
