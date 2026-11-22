import {
  inject,
  NgModule,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NgSelectModule } from '@ng-select/ng-select';
import { DialogModule } from '@angular/cdk/dialog';
import { NgxSonnerToaster } from 'ngx-sonner';
import { ToastrModule } from 'ngx-toastr';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { MobileMoneyConfigListComponent } from './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component';
import { WithdrawalFeeGridComponent } from './mobile-money-config/withdrawal-fee-grid/withdrawal-fee-grid.component';
import { DashboardChartModule } from './dashboard-chart/dashboard-chart.module';
import { SharedComponentsModule } from './shared/components/shared-components.module';
import { LicenseKeyFormatterPipe } from '@shared/pipes/license-key-formatter.pipe';
import { AuthInterceptor } from '@core/http/auth.interceptor';
import { LicenseInterceptorService } from '@core/http/license-interceptor.service';
import { FeatureFlagService } from './shared/service/feature-flag.service';
import { GoogleAnalyticsService } from './shared/service/google-analytics.service';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    LoginComponent,
    RegisterComponent,
    ReactivateLicenseComponent,
    LicenseKeyFormatterPipe,
    MobileMoneyConfigListComponent,
    WithdrawalFeeGridComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    NgxSpinnerModule,
    NgxPermissionsModule.forRoot(),
    MatStepperModule,
    MatListModule,
    MatCheckboxModule,
    MatTableModule,
    DashboardChartModule,
    MatCardModule,
    MatTabsModule,
    MatButtonToggleModule,
    NgSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    SharedComponentsModule,
    DialogModule,
    NgxSonnerToaster,
    ToastrModule.forRoot(),
    MatExpansionModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    provideCharts(withDefaultRegisterables()),
    { provide: HTTP_INTERCEPTORS, useClass: LicenseInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    provideAppInitializer(() => {
      const featureFlagService = inject(FeatureFlagService);
      const googleAnalyticsService = inject(GoogleAnalyticsService);
      googleAnalyticsService.init();
      return featureFlagService.init();
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
