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
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule } from '@angular/material/paginator';
import { SalesDetailsDialogComponent } from './components/sales-details-dialog/sales-details-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StockReceptionListComponent } from './pages/stock-reception-list/stock-reception-list.component';
import { StockReceptionDetailComponent } from './pages/stock-reception-detail/stock-reception-detail.component';


@NgModule({
  declarations: [
    StockRequestListComponent,
    StockRequestCreateComponent,
    MyStockDashboardComponent,
    StockReturnListComponent,
    StockReturnCreateComponent,
    SalesDetailsDialogComponent,
    StockReceptionListComponent,
    StockReceptionDetailComponent
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
