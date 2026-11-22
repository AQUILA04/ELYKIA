import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { DialogModule } from '@angular/cdk/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { provideToastr } from 'ngx-toastr';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AuthInterceptor } from '@core/http/auth.interceptor';
import { LicenseInterceptorService } from '@core/http/license-interceptor.service';
import { CompanyBrandingService } from '@core/services/company-branding.service';
import { FeatureFlagService } from '@shared/service/feature-flag.service';
import { GoogleAnalyticsService } from '@shared/service/google-analytics.service';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(APP_ROUTES),
    provideHttpClient(withInterceptorsFromDi()),
    provideCharts(withDefaultRegisterables()),
    provideToastr(),
    importProvidersFrom(
      DialogModule,
      MatDialogModule,
      MatSnackBarModule,
      MatNativeDateModule,
      NgxPermissionsModule.forRoot(),
      NgxSpinnerModule,
    ),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LicenseInterceptorService,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'fr-FR',
    },
    provideAppInitializer(() => {
      const featureFlagService = inject(FeatureFlagService);
      const googleAnalyticsService = inject(GoogleAnalyticsService);
      const companyBrandingService = inject(CompanyBrandingService);
      googleAnalyticsService.init();
      return Promise.all([
        featureFlagService.init(),
        companyBrandingService.init(),
      ]);
    }),
  ],
};
