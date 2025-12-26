import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Routing
import { OrdersRoutingModule } from './orders-routing.module';

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
import { MatStepperModule } from '@angular/material/stepper';

// Pages principales
import { OrderDashboardComponent } from './pages/order-dashboard/order-dashboard.component';
import { OrderDetailsComponent } from './pages/order-details/order-details.component';
import { OrderFormComponent } from './pages/order-form/order-form.component';

// Composants réutilisables
import { OrderKpiCardComponent } from './components/order-kpi-card/order-kpi-card.component';
import { OrderTableComponent } from './components/order-table/order-table.component';
import { OrderActionBarComponent } from './components/order-action-bar/order-action-bar.component';
import { OrderStatusBadgeComponent } from './components/order-status-badge/order-status-badge.component';

// Modales
import { OrderConfirmationModalComponent } from './components/modals/order-confirmation-modal/order-confirmation-modal.component';
import { OrderSellModalComponent } from './components/modals/order-sell-modal/order-sell-modal.component';
import { OrderDeleteModalComponent } from './components/modals/order-delete-modal/order-delete-modal.component';

// Composants utilitaires
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { ApiTestComponent } from './components/api-test/api-test.component';

// Services
import { OrderService } from './services/order.service';

@NgModule({
  declarations: [
    // Pages principales
    OrderDashboardComponent,
    OrderDetailsComponent,
    OrderFormComponent,
    
    // Composants réutilisables
    OrderKpiCardComponent,
    OrderTableComponent,
    OrderActionBarComponent,
    OrderStatusBadgeComponent,
    
    // Modales
    OrderConfirmationModalComponent,
    OrderSellModalComponent,
    OrderDeleteModalComponent,
    
    // Composants utilitaires
    EmptyStateComponent,
    ApiTestComponent
  ],
  imports: [
    // Modules Angular de base
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    OrdersRoutingModule,
    

    
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
    MatExpansionModule,
    MatStepperModule
  ],
  providers: [
    // Services Order
    OrderService
  ],
  exports: [
    // Exporter les composants réutilisables pour utilisation dans d'autres modules
    OrderKpiCardComponent,
    OrderTableComponent,
    OrderActionBarComponent,
    OrderStatusBadgeComponent,
    EmptyStateComponent
  ]
})
export class OrdersModule { }