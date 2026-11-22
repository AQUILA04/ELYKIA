import { importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';
import { provideToastr } from 'ngx-toastr';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
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

export default [
  provideZoneChangeDetection(),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([{ path: '**', children: [] }]),
  provideToastr(),
  importProvidersFrom(NgxPermissionsModule.forRoot()),
];
