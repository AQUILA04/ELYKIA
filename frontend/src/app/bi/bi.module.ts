import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Routing
import { BiRoutingModule } from './bi-routing.module';

// Chart.js
import { NgChartsModule } from 'ng2-charts';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';

// Pages principales
import { BiDashboardComponent } from './pages/bi-dashboard/bi-dashboard.component';
import { BiSalesDashboardComponent } from './pages/bi-sales-dashboard/bi-sales-dashboard.component';
import { BiCollectionsDashboardComponent } from './pages/bi-collections-dashboard/bi-collections-dashboard.component';
import { BiStockDashboardComponent } from './pages/bi-stock-dashboard/bi-stock-dashboard.component';

// Composants réutilisables
import { BiKpiCardComponent } from './components/bi-kpi-card/bi-kpi-card.component';
import { LineChartComponent } from './components/line-chart/line-chart.component';
import { BarChartComponent } from './components/bar-chart/bar-chart.component';
import { DonutChartComponent } from './components/donut-chart/donut-chart.component';

// Services
import { BiService } from './services/bi.service';
import { BiSalesService } from './services/bi-sales.service';
import { BiCollectionsService } from './services/bi-collections.service';
import { BiStockService } from './services/bi-stock.service';

@NgModule({
  declarations: [
    // Pages principales
    BiDashboardComponent,
    BiSalesDashboardComponent,
    BiCollectionsDashboardComponent,
    BiStockDashboardComponent,
    
    // Composants réutilisables
    BiKpiCardComponent,
    LineChartComponent,
    BarChartComponent,
    DonutChartComponent
  ],
  imports: [
    // Modules Angular de base
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    BiRoutingModule,
    
    // Chart.js
    NgChartsModule,
    
    // Modules Angular Material
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatCardModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatExpansionModule
  ],
  providers: [
    // Services BI
    BiService,
    BiSalesService,
    BiCollectionsService,
    BiStockService
  ],
  exports: [
    // Exporter les composants réutilisables
    BiKpiCardComponent
  ]
})
export class BiModule { }
