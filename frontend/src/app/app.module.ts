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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { BreadcrumbComponent } from './bread/breadcrumb/breadcrumb.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LocalityListComponent } from './locality/localitylist/localitylist.component';
import { LocalityDetailsComponent } from './locality/localitydetails/localitydetails.component';
import { AccountAddComponent } from './account/accountadd/accountadd.component';
import { AccountListComponent } from './account/accountlist/accountlist.component';
import { AccountdetailsComponent } from './account/accountdetails/accountdetails.component';
import { LocalityAddComponent } from './locality/localityadd/localityadd.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardV2Component } from './dashboard/dashboard-v2/dashboard-v2.component';
import { DashboardKpiCardComponent } from './dashboard/dashboard-v2/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { RecentSalesPanelComponent } from './dashboard/dashboard-v2/components/recent-sales-panel/recent-sales-panel.component';
import { RecentActivityPanelComponent } from './dashboard/dashboard-v2/components/recent-activity-panel/recent-activity-panel.component';
import { SalesEvolutionChartComponent } from './dashboard/dashboard-v2/components/sales-evolution-chart/sales-evolution-chart.component';
import { StockStatusChartComponent } from './dashboard/dashboard-v2/components/stock-status-chart/stock-status-chart.component';
import { DashboardStockkeeperAlertsComponent } from './dashboard/dashboard-v2/components/dashboard-stockkeeper-alerts/dashboard-stockkeeper-alerts.component';
import { TimeAgoPipe } from './dashboard/dashboard-v2/pipes/time-ago.pipe';
import { NgChartsModule } from 'ng2-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxSpinnerModule } from 'ngx-spinner';
import { AuthInterceptor } from './shared/auth.interceptor';
import { OpenCashDeskComponent } from './cash-desk/open-cash-desk/open-cash-desk.component';
import { CloseCashDeskComponent } from './cash-desk/close-cash-desk/close-cash-desk.component';
import { DailyOperationComponent } from './cash-desk/daily-operation/daily-operation.component';
import { MatStepperModule } from '@angular/material/stepper';
import { TFJComponent } from './cash-desk/tfj/tfj.component';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { BilletageModule } from './cash-desk/billetage/billetage.module';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { NgApexchartsModule } from 'ng-apexcharts';
// Tontine components removed - now using lazy loaded module
import { GestionAddComponent } from './gestion/gestion-add/gestion-add.component';
import { GestionListComponent } from './gestion/gestion-list/gestion-list.component';
import { GestionDetailsComponent } from './gestion/gestion-details/gestion-details.component';
import { OperationAddComponent } from './operation/operation-add/operation-add.component';
import { OperationListComponent } from './operation/operation-list/operation-list.component';
import { OperationDetailsComponent } from './operation/operation-details/operation-details.component';
import { DepositAddComponent } from './deposit/deposit-add/deposit-add.component';
import { DepositListComponent } from './deposit/deposit-list/deposit-list.component';
import { DepositDetailsComponent } from './deposit/deposit-details/deposit-details.component';
import { LicenseInterceptorService } from './interceptors/license-interceptor.service';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { OutListComponent } from './out/out-list/out-list.component';
import { HistoryComponent } from './history/history.component';
import { OutDetailsComponent } from './out/out-details/out-details.component';
import { HistoryDetailsComponent } from './history/history-details/history-details.component';
import { Back2StoreComponent } from './history/back2-store/back2-store.component';
import { CommercialListComponent } from './commercial/commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial/commercial-view/commercial-view.component';
import { OutPdfListComponent } from './out/out-pdf-list/out-pdf-list.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LicenseKeyFormatterPipe } from './shared/pipe/license-key-formatter.pipe'; // Ajustez le chemin si nécessaire
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgSelectModule } from '@ng-select/ng-select';

// MODULES MANQUANTS AJOUTÉS ICI
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { OldReleaseListComponent } from './out/old-release-list/old-release-list.component';
// Tontine module is lazy loaded, no need to import here
import { SharedComponentsModule } from './shared/components/shared-components.module';
import { ToastrModule } from 'ngx-toastr';
import { MobileMoneyConfigListComponent } from './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component';
import {NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule} from "ngx-google-analytics";
import {environment} from "../environments/environment";
import { FeatureFlagService } from './shared/service/feature-flag.service';

export function initializeApp(featureFlagService: FeatureFlagService) {
  return () => featureFlagService.init();
}

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    BreadcrumbComponent,
    LocalityListComponent,
    LocalityDetailsComponent,
    AccountAddComponent,
    AccountListComponent,
    AccountdetailsComponent,
    LocalityAddComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    DashboardV2Component,
    DashboardKpiCardComponent,
    RecentSalesPanelComponent,
    RecentActivityPanelComponent,
    SalesEvolutionChartComponent,
    StockStatusChartComponent,
    DashboardStockkeeperAlertsComponent,
    TimeAgoPipe,
    OpenCashDeskComponent,
    CloseCashDeskComponent,
    DailyOperationComponent,
    TFJComponent,
    DashboardChartComponent,
    GestionAddComponent,
    GestionListComponent,
    GestionDetailsComponent,
    OperationAddComponent,
    OperationListComponent,
    OperationDetailsComponent,
    DepositAddComponent,
    DepositListComponent,
    DepositDetailsComponent,
    ReactivateLicenseComponent,
    OutListComponent,
    HistoryComponent,
    OutDetailsComponent,
    HistoryDetailsComponent,
    Back2StoreComponent,
    CommercialListComponent,
    CommercialViewComponent,
    OutPdfListComponent,
    LicenseKeyFormatterPipe,
    OldReleaseListComponent,
    MobileMoneyConfigListComponent,
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
    NgApexchartsModule,
    MatCardModule,
    MatTabsModule,
    MatButtonToggleModule,
    NgSelectModule,
    MatAutocompleteModule,
    // Tontine module is lazy loaded, not imported here
    MatDatepickerModule,
    MatNativeDateModule,
    SharedComponentsModule,
    BilletageModule,
    ToastrModule.forRoot(),
    MatExpansionModule,
    NgChartsModule,
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
