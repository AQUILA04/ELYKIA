import { DatePipe } from '@angular/common';
import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { ScannedActionsSubject, Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { registerAllIcons } from './app/core/icons/register-icons';

registerAllIcons();

if (typeof Element !== 'undefined' && typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = () => {};
}

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  if (typeof window.ResizeObserver === 'undefined') {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }

  if (typeof window.IntersectionObserver === 'undefined') {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    };
  }
}

export default [
  provideZoneChangeDetection(),
  provideIonicAngular(),
  provideHttpClient(withInterceptorsFromDi()),
  provideHttpClientTesting(),
  provideRouter([{ path: '**', children: [] }]),
  DatePipe,
  {
    provide: ScannedActionsSubject,
    useFactory: () => new Subject(),
  },
  {
    provide: Store,
    useValue: {
      select: () => of(null),
      selectSignal: () => () => null,
      dispatch: () => {},
      pipe: () => of(null),
      subscribe: () => ({ unsubscribe: () => {} }),
    },
  },
  {
    provide: Storage,
    useValue: {
      create: () => Promise.resolve(),
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      clear: () => Promise.resolve(),
      keys: () => Promise.resolve([]),
    },
  },
  {
    provide: ActivatedRoute,
    useValue: {
      snapshot: {
        paramMap: convertToParamMap({}),
        queryParamMap: convertToParamMap({}),
        params: {},
        queryParams: {},
      },
      paramMap: of(convertToParamMap({})),
      queryParamMap: of(convertToParamMap({})),
      params: of({}),
      queryParams: of({}),
    },
  },
];
