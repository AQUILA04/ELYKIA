import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions'; // Added NgxPermissionsModule import

import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatError } from '@angular/material/form-field';
import { MatDialogActions } from '@angular/material/dialog';
import { MatSpinner } from '@angular/material/progress-spinner';

// Routing
import { TontineRoutingModule } from './tontine-routing.module';

// Angular Material Modules
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
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
    DeliveryArticleSelectionModalComponent
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
  ],
  providers: [
    TontineService,
    TontineDeliveryService,
    TontineSessionService
  ]
})
export class TontineModule { }
