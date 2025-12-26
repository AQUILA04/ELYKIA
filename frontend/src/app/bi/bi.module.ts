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
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
