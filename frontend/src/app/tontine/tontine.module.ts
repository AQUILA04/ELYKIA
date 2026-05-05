import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions'; // Added NgxPermissionsModule import
import { SharedComponentsModule } from '../shared/components/shared-components.module';

import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyError as MatError } from '@angular/material/legacy-form-field';
import { MatLegacyDialogActions as MatDialogActions } from '@angular/material/legacy-dialog';
import { MatLegacySpinner as MatSpinner } from '@angular/material/legacy-progress-spinner';

// Routing
import { TontineRoutingModule } from './tontine-routing.module';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio'; // Added MatRadioModule

// Pages
import { TontineDashboardComponent } from './pages/tontine-dashboard/tontine-dashboard.component';
import { MemberDetailsComponent } from './pages/member-details/member-details.component';
import { SessionComparisonComponent } from './pages/session-comparison/session-comparison.component';
import { TontineMagasinierDashboardComponent } from './pages/magasinier-dashboard/tontine-magasinier-dashboard.component'; // New component

// Components
import { TontineKpiCardComponent } from './components/kpi-card/kpi-card.component';
import { TontineFilterBarComponent } from './components/filter-bar/filter-bar.component';
import { TontineMemberTableComponent } from './components/member-table/member-table.component';
import { SessionSelectorComponent } from './components/session-selector/session-selector.component';

// Modals
import { AddMemberModalComponent } from './components/modals/add-member-modal/add-member-modal.component';
import { RecordCollectionModalComponent } from './components/modals/record-collection-modal/record-collection-modal.component';
import { SessionSettingsModalComponent } from './components/modals/session-settings-modal/session-settings-modal.component';
import { DeliveryArticleSelectionModalComponent } from './components/modals/delivery-article-selection-modal/delivery-article-selection-modal.component';

// Services
import { TontineService } from './services/tontine.service';
import { TontineDeliveryService } from './services/tontine-delivery.service';
import { TontineSessionService } from './services/tontine-session.service';
import { AddMultipleMembersModalComponent } from './components/modals/add-multiple-members-modal';

// Import des composants de Collectes de Tontine
import { TontineCollecteComponent } from './collecte/tontine-collecte.component';
import { TontineCollecteKpiComponent } from './collecte/components/tontine-collecte-kpi/tontine-collecte-kpi.component';
import { TontineCollecteFilterComponent } from './collecte/components/tontine-collecte-filter/tontine-collecte-filter.component';
import { TontineCollecteTableComponent } from './collecte/components/tontine-collecte-table/tontine-collecte-table.component';

@NgModule({
  declarations: [
    // Pages
    TontineDashboardComponent,
    MemberDetailsComponent,
    SessionComparisonComponent,
    TontineMagasinierDashboardComponent, // Declared new component

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

    // Modules Angular Material
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
    NgxPermissionsModule, // Added NgxPermissionsModule to imports
    MatProgressBarModule,
    MatOptionModule,
    MatCheckboxModule,
    MatRadioModule, // Added MatRadioModule to imports

    SharedComponentsModule
  ],
  providers: [
    TontineService,
    TontineDeliveryService,
    TontineSessionService
  ]
})
export class TontineModule { }
