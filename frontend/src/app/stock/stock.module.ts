import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StockRoutingModule } from './stock-routing.module';
import { StockRequestListComponent } from './pages/stock-request-list/stock-request-list.component';
import { StockRequestCreateComponent } from './pages/stock-request-create/stock-request-create.component';
import { MyStockDashboardComponent } from './pages/my-stock-dashboard/my-stock-dashboard.component';
import { StockReturnListComponent } from './pages/stock-return-list/stock-return-list.component';
import { StockReturnCreateComponent } from './pages/stock-return-create/stock-return-create.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { SalesDetailsDialogComponent } from './components/sales-details-dialog/sales-details-dialog.component';
import { StockMovementDialogComponent } from './components/stock-movement-dialog/stock-movement-dialog.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { StockReceptionListComponent } from './pages/stock-reception-list/stock-reception-list.component';
import { StockReceptionDetailComponent } from './pages/stock-reception-detail/stock-reception-detail.component';
import { RattrapageCreditAddComponent } from './rattrapage/rattrapage-credit-add.component';


@NgModule({
  declarations: [
    StockRequestListComponent,
    StockRequestCreateComponent,
    MyStockDashboardComponent,
    StockReturnListComponent,
    StockReturnCreateComponent,
    SalesDetailsDialogComponent,
    StockMovementDialogComponent,
    StockReceptionListComponent,
    StockReceptionDetailComponent,
    RattrapageCreditAddComponent
  ],
  imports: [
    CommonModule,
    StockRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NgxSpinnerModule,
    MatFormFieldModule,
    NgSelectModule,
    MatExpansionModule,
    MatPaginatorModule,
    MatDialogModule,
    MatTableModule,
    MatProgressSpinnerModule
  ]
})
export class StockModule { }
