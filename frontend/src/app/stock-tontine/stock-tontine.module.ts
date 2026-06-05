import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { StockTontineRoutingModule } from './stock-tontine-routing.module';
import { SharedModule } from '../shared/shared.module';
import { SharedComponentsModule } from '../shared/components/shared-components.module';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NgxSpinnerModule } from 'ngx-spinner';
import { NgSelectModule } from '@ng-select/ng-select';

// Components
import { StockTontineRequestListComponent } from './pages/stock-tontine-request-list/stock-tontine-request-list.component';
import { StockTontineRequestCreateComponent } from './pages/stock-tontine-request-create/stock-tontine-request-create.component';
import { StockTontineReturnListComponent } from './pages/stock-tontine-return-list/stock-tontine-return-list.component';
import { StockTontineReturnCreateComponent } from './pages/stock-tontine-return-create/stock-tontine-return-create.component';
import { MyTontineStockDashboardComponent } from './pages/my-tontine-stock-dashboard/my-tontine-stock-dashboard.component';
import { TontineStockMovementDialogComponent } from './components/tontine-stock-movement-dialog/tontine-stock-movement-dialog.component';
import { TontineDeliveryDetailsDialogComponent } from './components/tontine-delivery-details-dialog/tontine-delivery-details-dialog.component';

@NgModule({
  declarations: [
    StockTontineRequestListComponent,
    StockTontineRequestCreateComponent,
    StockTontineReturnListComponent,
    StockTontineReturnCreateComponent,
    MyTontineStockDashboardComponent,
    TontineStockMovementDialogComponent,
    TontineDeliveryDetailsDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StockTontineRoutingModule,
    SharedModule,
    SharedComponentsModule,
    NgxSpinnerModule,
    NgSelectModule,
    // Angular Material
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatExpansionModule,
    MatPaginatorModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
})
export class StockTontineModule {}
