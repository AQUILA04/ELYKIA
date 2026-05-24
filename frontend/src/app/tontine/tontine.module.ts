import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';
import { SharedModule } from '../shared/shared.module';
import { SharedComponentsModule } from '../shared/components/shared-components.module';

// Angular Material Modules (MDC)
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Routing
import { TontineRoutingModule } from './tontine-routing.module';

// Pages
import { TontineDashboardComponent } from './pages/tontine-dashboard/tontine-dashboard.component';
import { MemberDetailsComponent } from './pages/member-details/member-details.component';
import { SessionComparisonComponent } from './pages/session-comparison/session-comparison.component';
import { TontineMagasinierDashboardComponent } from './pages/magasinier-dashboard/tontine-magasinier-dashboard.component';

// Components
import { TontineKpiCardComponent } from './components/kpi-card/kpi-card.component';
import { TontineFilterBarComponent } from './components/filter-bar/filter-bar.component';
import { TontineMemberTableComponent } from './components/member-table/member-table.component';
import { SessionSelectorComponent } from './components/session-selector/session-selector.component';

// Modals
import { AddMemberModalComponent } from './components/modals/add-member-modal/add-member-modal.component';
import { AddMultipleMembersModalComponent } from './components/modals/add-multiple-members-modal/add-multiple-members-modal.component';
import { RecordCollectionModalComponent } from './components/modals/record-collection-modal/record-collection-modal.component';
import { SessionSettingsModalComponent } from './components/modals/session-settings-modal/session-settings-modal.component';
import { DeliveryArticleSelectionModalComponent } from './components/modals/delivery-article-selection-modal/delivery-article-selection-modal.component';

// Collectes
import { TontineCollecteComponent } from './collecte/tontine-collecte.component';
import { TontineCollecteKpiComponent } from './collecte/components/tontine-collecte-kpi/tontine-collecte-kpi.component';
import { TontineCollecteFilterComponent } from './collecte/components/tontine-collecte-filter/tontine-collecte-filter.component';
import { TontineCollecteTableComponent } from './collecte/components/tontine-collecte-table/tontine-collecte-table.component';

// Services
import { TontineService } from './services/tontine.service';
import { TontineDeliveryService } from './services/tontine-delivery.service';
import { TontineSessionService } from './services/tontine-session.service';

@NgModule({
  declarations: [
    // Pages
    TontineDashboardComponent,
    MemberDetailsComponent,
    SessionComparisonComponent,
    TontineMagasinierDashboardComponent,

    // Components
    TontineKpiCardComponent,
    TontineFilterBarComponent,
    TontineMemberTableComponent,
    SessionSelectorComponent,

    // Modals
    AddMemberModalComponent,
    AddMultipleMembersModalComponent,
    RecordCollectionModalComponent,
    SessionSettingsModalComponent,
    DeliveryArticleSelectionModalComponent,

    // Collectes
    TontineCollecteComponent,
    TontineCollecteKpiComponent,
    TontineCollecteFilterComponent,
    TontineCollecteTableComponent
  ],
  imports: [
    // Modules Angular de base
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TontineRoutingModule,
    SharedModule,
    SharedComponentsModule,

    // Angular Material
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    NgxPermissionsModule,
    MatProgressBarModule,
    MatListModule,
    MatCheckboxModule,
    MatRadioModule,
    MatChipsModule,
    MatMenuModule,
    MatTabsModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatStepperModule
  ],
  providers: [
    TontineService,
    TontineDeliveryService,
    TontineSessionService
  ]
})
export class TontineModule { }
