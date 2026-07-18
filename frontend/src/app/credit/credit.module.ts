import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { CreditRoutingModule } from './credit-routing.module';
import { CreditAddComponent } from './credit-add/credit-add.component';
import { CreditListComponent } from './credit-list/credit-list.component';
import { CreditDetailsComponent } from './credit-details/credit-details.component';
import { DistributionComponent } from './distribution/distribution.component';
import { CreditViewComponent } from './credit-view/credit-view.component';
import { CreditMergeModalComponent } from './credit-merge-modal/credit-merge-modal.component';
import { DailyStakeModalComponent } from './components/daily-stake-modal/daily-stake-modal.component';
import { CreditLateComponent } from './credit-late/credit-late.component';
import { CreditLateKpiComponent } from './credit-late/components/credit-late-kpi/credit-late-kpi.component';
import { CreditLateFilterComponent } from './credit-late/components/credit-late-filter/credit-late-filter.component';
import { CreditLateTableComponent } from './credit-late/components/credit-late-table/credit-late-table.component';
import { CreditLateCloseModalComponent } from './credit-late/components/credit-late-close-modal/credit-late-close-modal.component';
import { CreditListKpiComponent } from './credit-list/components/credit-list-kpi/credit-list-kpi.component';
import { CreditEcheanceComponent } from './credit-echeance/credit-echeance.component';
import { CreditEcheanceKpiComponent } from './credit-echeance/components/credit-echeance-kpi/credit-echeance-kpi.component';
import { CreditEcheanceCalendarComponent } from './credit-echeance/components/credit-echeance-calendar/credit-echeance-calendar.component';
import { CreditEcheanceFilterComponent } from './credit-echeance/components/credit-echeance-filter/credit-echeance-filter.component';
import { CreditEcheanceTableComponent } from './credit-echeance/components/credit-echeance-table/credit-echeance-table.component';
import { RecouvrementComponent } from './recouvrement/recouvrement.component';
import { RecouvrementKpiComponent } from './recouvrement/components/recouvrement-kpi/recouvrement-kpi.component';
import { RecouvrementFilterComponent } from './recouvrement/components/recouvrement-filter/recouvrement-filter.component';
import { RecouvrementTableComponent } from './recouvrement/components/recouvrement-table/recouvrement-table.component';

@NgModule({
  declarations: [
    CreditAddComponent,
    CreditListComponent,
    CreditDetailsComponent,
    DistributionComponent,
    CreditViewComponent,
    CreditMergeModalComponent,
    DailyStakeModalComponent,
    CreditLateComponent,
    CreditLateKpiComponent,
    CreditLateFilterComponent,
    CreditLateTableComponent,
    CreditLateCloseModalComponent,
    CreditListKpiComponent,
    CreditEcheanceComponent,
    CreditEcheanceKpiComponent,
    CreditEcheanceCalendarComponent,
    CreditEcheanceFilterComponent,
    CreditEcheanceTableComponent,
    RecouvrementComponent,
    RecouvrementKpiComponent,
    RecouvrementFilterComponent,
    RecouvrementTableComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CreditRoutingModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    SharedComponentsModule,
    NgSelectModule,
    MatPaginatorModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatStepperModule,
    MatAutocompleteModule,
    MatCardModule,
    MatListModule,
  ],
})
export class CreditModule {}
