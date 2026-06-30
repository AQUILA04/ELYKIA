import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { AddComponent } from './article/add/add.component';
import { ListComponent } from './article/list/list.component';
import { DetailComponent } from './article/details/details.component';
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
import { ClientAddComponent } from './client/client-add/client-add.component';
import { ClientListComponent } from './client/client-list/client-list.component';
import { ClientDetailsComponent } from './client/client-details/client-details.component';
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
import { AccountingDayComponent } from './accounting-day/accounting-day.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxSpinnerModule } from 'ngx-spinner';
import { CreditAddComponent } from './credit/credit-add/credit-add.component';
import { CreditListComponent } from './credit/credit-list/credit-list.component';
import { CreditDetailsComponent } from './credit/credit-details/credit-details.component';
import { UserAddComponent } from './user/user-add/user-add.component';
import { UserListComponent } from './user/user-list/user-list.component';
import { UserDetailsComponent } from './user/user-details/user-details.component';
import { ChangePasswordComponent } from './user/change-password/change-password.component';
import { AuthInterceptor } from './shared/auth.interceptor';
import { OpenCashDeskComponent } from './cash-desk/open-cash-desk/open-cash-desk.component';
import { CloseCashDeskComponent } from './cash-desk/close-cash-desk/close-cash-desk.component';
import { DailyOperationComponent } from './cash-desk/daily-operation/daily-operation.component';
import { MatStepperModule } from '@angular/material/stepper';
import { TFJComponent } from './cash-desk/tfj/tfj.component';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { BilletageComponent } from './cash-desk/billetage/billetage.component';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { NgApexchartsModule } from 'ng-apexcharts';
// Tontine components removed - now using lazy loaded module
import { InventoryComponent } from './inventory/inventory/inventory.component';
import { AddInventoryComponent } from './inventory/inventory-add/inventory-add.component';
import { InventoryReconciliationComponent } from './inventory/inventory-reconciliation/inventory-reconciliation.component';
import { PhysicalQuantityModalComponent } from './inventory/physical-quantity-modal/physical-quantity-modal.component';
import { GestionAddComponent } from './gestion/gestion-add/gestion-add.component';
import { GestionListComponent } from './gestion/gestion-list/gestion-list.component';
import { GestionDetailsComponent } from './gestion/gestion-details/gestion-details.component';
import { OperationAddComponent } from './operation/operation-add/operation-add.component';
import { OperationListComponent } from './operation/operation-list/operation-list.component';
import { OperationDetailsComponent } from './operation/operation-details/operation-details.component';
import { DepositAddComponent } from './deposit/deposit-add/deposit-add.component';
import { DepositListComponent } from './deposit/deposit-list/deposit-list.component';
import { DepositDetailsComponent } from './deposit/deposit-details/deposit-details.component';
import { ReportComponent } from './report/report/report.component';
import { DailyReportComponent } from './report/pages/daily-report/daily-report.component';
import { LicenseInterceptorService } from './interceptors/license-interceptor.service';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { OutListComponent } from './out/out-list/out-list.component';
import { HistoryComponent } from './history/history.component';
import { OutDetailsComponent } from './out/out-details/out-details.component';
import { HistoryDetailsComponent } from './history/history-details/history-details.component';
import { Back2StoreComponent } from './history/back2-store/back2-store.component';
import { DistributionComponent } from './credit/distribution/distribution.component';
import { CommercialListComponent } from './commercial/commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial/commercial-view/commercial-view.component';
import { ClientViewComponent } from './client/client-view/client-view.component';
import { OutPdfListComponent } from './out/out-pdf-list/out-pdf-list.component';
import { CreditViewComponent } from './credit/credit-view/credit-view.component';
import { StatusBadgePipe } from './shared/pipes/status-badge.pipe';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LicenseKeyFormatterPipe } from './shared/pipe/license-key-formatter.pipe'; // Ajustez le chemin si nécessaire
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgSelectModule } from '@ng-select/ng-select';

// MODULES MANQUANTS AJOUTÉS ICI
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { OldReleaseListComponent } from './out/old-release-list/old-release-list.component';
import { CreditMergeModalComponent } from './credit/credit-merge-modal/credit-merge-modal.component';
// Tontine module is lazy loaded, no need to import here
// --- NOUVELLE IMPORTATION ---
import { AdvancedSearchComponent } from './credit/components/advanced-search/advanced-search.component';
import { SharedComponentsModule } from './shared/components/shared-components.module';
import { ToastrModule } from 'ngx-toastr';
import { ParameterListComponent } from './parameters/parameter-list/parameter-list.component';
import { ParameterEditComponent } from './parameters/parameter-edit/parameter-edit.component';
import { CashDepositModalComponent } from './report/components/cash-deposit-modal/cash-deposit-modal.component';
import { DailyStakeModalComponent } from './credit/components/daily-stake-modal/daily-stake-modal.component';
import { ClientKpiCardsComponent } from './client/components/client-kpi-cards/client-kpi-cards.component';
import { ClientInfoCardComponent } from './client/components/client-info-card/client-info-card.component';
import { ClientCreditListComponent } from './client/components/client-credit-list/client-credit-list.component';
import { ClientCotisationHistoryComponent } from './client/components/client-cotisation-history/client-cotisation-history.component';
// --- Article Detail Sub-Components ---
import { StockGaugeComponent } from './article/details/components/stock-gauge/stock-gauge.component';
import { PriceCardComponent } from './article/details/components/price-card/price-card.component';
import { MovementTableComponent } from './article/details/components/movement-table/movement-table.component';
import { StateTimelineComponent } from './article/details/components/state-timeline/state-timeline.component';
import { PriceHistoryTimelineComponent } from './article/details/components/price-history-timeline/price-history-timeline.component';
import { QuickStockEntryComponent } from './article/details/components/quick-stock-entry/quick-stock-entry.component';
import { StockLotsTableComponent } from './article/details/components/stock-lots-table/stock-lots-table.component';
import { CreditLateComponent } from './credit/credit-late/credit-late.component';
import { CreditLateKpiComponent } from './credit/credit-late/components/credit-late-kpi/credit-late-kpi.component';
import { CreditListKpiComponent } from './credit/credit-list/components/credit-list-kpi/credit-list-kpi.component';
import { CreditLateFilterComponent } from './credit/credit-late/components/credit-late-filter/credit-late-filter.component';
import { CreditLateTableComponent } from './credit/credit-late/components/credit-late-table/credit-late-table.component';
import { CreditLateCloseModalComponent } from './credit/credit-late/components/credit-late-close-modal/credit-late-close-modal.component';
import { RecoveryManagerReportTabComponent } from './report/components/recovery-manager-report-tab/recovery-manager-report-tab.component';
import { CashPeriodRemittanceTabComponent } from './report/components/cash-period-remittance-tab/cash-period-remittance-tab.component';
import { MonthlyReportsComponent } from './report/pages/monthly-reports/monthly-reports.component';
import { CreditEcheanceComponent } from './credit/credit-echeance/credit-echeance.component';
import { CreditEcheanceKpiComponent } from './credit/credit-echeance/components/credit-echeance-kpi/credit-echeance-kpi.component';
import { CreditEcheanceCalendarComponent } from './credit/credit-echeance/components/credit-echeance-calendar/credit-echeance-calendar.component';
import { CreditEcheanceFilterComponent } from './credit/credit-echeance/components/credit-echeance-filter/credit-echeance-filter.component';
import { CreditEcheanceTableComponent } from './credit/credit-echeance/components/credit-echeance-table/credit-echeance-table.component';
import { RecouvrementComponent } from './credit/recouvrement/recouvrement.component';
import { RecouvrementKpiComponent } from './credit/recouvrement/components/recouvrement-kpi/recouvrement-kpi.component';
import { RecouvrementFilterComponent } from './credit/recouvrement/components/recouvrement-filter/recouvrement-filter.component';
import { RecouvrementTableComponent } from './credit/recouvrement/components/recouvrement-table/recouvrement-table.component';
import {NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule} from "ngx-google-analytics";
import {environment} from "../environments/environment";
import { AngularFireModule } from '@angular/fire/compat';
import { FeatureFlagService } from './shared/service/feature-flag.service';

export function initializeApp(featureFlagService: FeatureFlagService) {
  return () => featureFlagService.init();
}

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    AddComponent,
    ListComponent,
    DetailComponent,
    BreadcrumbComponent,
    LocalityListComponent,
    LocalityDetailsComponent,
    AccountAddComponent,
    AccountListComponent,
    AccountdetailsComponent,
    LocalityAddComponent,
    ClientAddComponent,
    ClientListComponent,
    ClientDetailsComponent,
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
    AccountingDayComponent,
    CreditAddComponent,
    CreditListComponent,
    CreditDetailsComponent,
    UserAddComponent,
    UserListComponent,
    UserDetailsComponent,
    ChangePasswordComponent,
    OpenCashDeskComponent,
    CloseCashDeskComponent,
    DailyOperationComponent,
    TFJComponent,
    BilletageComponent,
    DashboardChartComponent,
    InventoryComponent,
    AddInventoryComponent,
    InventoryReconciliationComponent,
    PhysicalQuantityModalComponent,
    GestionAddComponent,
    GestionListComponent,
    GestionDetailsComponent,
    OperationAddComponent,
    OperationListComponent,
    OperationDetailsComponent,
    DepositAddComponent,
    DepositListComponent,
    DepositDetailsComponent,
    ReportComponent,
    DailyReportComponent,
    ReactivateLicenseComponent,
    OutListComponent,
    HistoryComponent,
    OutDetailsComponent,
    HistoryDetailsComponent,
    Back2StoreComponent,
    DistributionComponent,
    CommercialListComponent,
    CommercialViewComponent,
    ClientViewComponent,
    OutPdfListComponent,
    CreditViewComponent,
    StatusBadgePipe,
    LicenseKeyFormatterPipe,
    OldReleaseListComponent,
    CreditMergeModalComponent,
    // --- NOUVELLE DÉCLARATION ---
    ParameterListComponent,
    ParameterEditComponent,
    CashDepositModalComponent,
    DailyStakeModalComponent,
    ClientKpiCardsComponent,
    ClientInfoCardComponent,
    ClientCreditListComponent,
    ClientCotisationHistoryComponent,
    // --- Article Detail Sub-Components ---
    StockGaugeComponent,
    PriceCardComponent,
    MovementTableComponent,
    StateTimelineComponent,
    PriceHistoryTimelineComponent,
    QuickStockEntryComponent,
    StockLotsTableComponent,
    CreditLateComponent,
    CreditLateKpiComponent,
    CreditListKpiComponent,
    CreditLateFilterComponent,
    CreditLateTableComponent,
    CreditLateCloseModalComponent,
    RecoveryManagerReportTabComponent,
    CashPeriodRemittanceTabComponent,
    MonthlyReportsComponent,
    CreditEcheanceComponent,
    CreditEcheanceKpiComponent,
    CreditEcheanceCalendarComponent,
    CreditEcheanceFilterComponent,
    CreditEcheanceTableComponent,
    RecouvrementComponent,
    RecouvrementKpiComponent,
    RecouvrementFilterComponent,
    RecouvrementTableComponent
    // --- NOUVELLES COMPOSANTS DÉPLACÉS DANS SHARED ---
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
    ToastrModule.forRoot(),
    MatExpansionModule,
    NgChartsModule,
    // Initialise GA avec votre ID
    NgxGoogleAnalyticsModule.forRoot(environment.gaMeasurementId),
    // Track automatique les changements de routes (pages vues)
    NgxGoogleAnalyticsRouterModule,
    AngularFireModule.initializeApp(environment.firebase),
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
