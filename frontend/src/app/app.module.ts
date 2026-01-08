import { NgModule } from '@angular/core';
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
import { AccountingDayComponent } from './accounting-day/accounting-day.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxSpinnerModule } from 'ngx-spinner';
import { CreditAddComponent } from './credit/credit-add/credit-add.component';
import { CreditListComponent } from './credit/credit-list/credit-list.component';
import { CreditDetailsComponent } from './credit/credit-details/credit-details.component';
import { UserAddComponent } from './user/user-add/user-add.component';
import { UserListComponent } from './user/user-list/user-list.component';
import { UserDetailsComponent } from './user/user-details/user-details.component';
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
import { MatNativeDateModule } from '@angular/material/core';
import { OldReleaseListComponent } from './out/old-release-list/old-release-list.component';
import { CreditMergeModalComponent } from './credit/credit-merge-modal/credit-merge-modal.component';
// Tontine module is lazy loaded, no need to import here
// --- NOUVELLE IMPORTATION ---
import { AdvancedSearchComponent } from './credit/components/advanced-search/advanced-search.component';
import { SharedComponentsModule } from './shared/components/shared-components.module';
import { ToastrModule } from 'ngx-toastr';

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
    AccountingDayComponent,
    CreditAddComponent,
    CreditListComponent,
    CreditDetailsComponent,
    UserAddComponent,
    UserListComponent,
    UserDetailsComponent,
    OpenCashDeskComponent,
    CloseCashDeskComponent,
    DailyOperationComponent,
    TFJComponent,
    BilletageComponent,
    DashboardChartComponent,
    InventoryComponent,
    AddInventoryComponent,
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
    CreditMergeModalComponent
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
    ToastrModule.forRoot()
  ],
  providers: [
    // --- CORRECTION DES PROVIDERS ---
    { provide: HTTP_INTERCEPTORS, useClass: LicenseInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
