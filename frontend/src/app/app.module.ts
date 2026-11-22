import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxSpinnerModule } from 'ngx-spinner';
import { AuthInterceptor } from './shared/auth.interceptor';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { DashboardChartModule } from './dashboard-chart/dashboard-chart.module';
import { LicenseInterceptorService } from './interceptors/license-interceptor.service';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LicenseKeyFormatterPipe } from './shared/pipe/license-key-formatter.pipe';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { SharedComponentsModule } from './shared/components/shared-components.module';
import { ToastrModule } from 'ngx-toastr';
import { MobileMoneyConfigListComponent } from './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component';
import { WithdrawalFeeGridComponent } from './mobile-money-config/withdrawal-fee-grid/withdrawal-fee-grid.component';
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import { environment } from '../environments/environment';
import { FeatureFlagService } from './shared/service/feature-flag.service';

export function initializeApp(featureFlagService: FeatureFlagService) {
  return () => featureFlagService.init();
}

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
    BrowserAnimationsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    MatPaginatorModule,
    HttpClientModule,
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
    ToastrModule.forRoot(),
    MatExpansionModule,
    // Initialise GA avec votre ID
    NgxGoogleAnalyticsModule.forRoot(environment.gaMeasurementId),
    // Track automatique les changements de routes (pages vues)
    NgxGoogleAnalyticsRouterModule,
  ],
  providers: [
    // --- CORRECTION DES PROVIDERS ---
    { provide: HTTP_INTERCEPTORS, useClass: LicenseInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FeatureFlagService],
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
