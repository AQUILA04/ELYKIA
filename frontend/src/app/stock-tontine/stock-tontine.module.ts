import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StockTontineRoutingModule } from './stock-tontine-routing.module';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';

// Components (à créer)
import { StockTontineRequestListComponent } from './pages/stock-tontine-request-list/stock-tontine-request-list.component';
import { StockTontineRequestCreateComponent } from './pages/stock-tontine-request-create/stock-tontine-request-create.component';
import { StockTontineReturnListComponent } from './pages/stock-tontine-return-list/stock-tontine-return-list.component';
import { StockTontineReturnCreateComponent } from './pages/stock-tontine-return-create/stock-tontine-return-create.component';
import { MyTontineStockDashboardComponent } from './pages/my-tontine-stock-dashboard/my-tontine-stock-dashboard.component';


@NgModule({
  declarations: [
    StockTontineRequestListComponent,
    StockTontineRequestCreateComponent,
    StockTontineReturnListComponent,
    StockTontineReturnCreateComponent,
    MyTontineStockDashboardComponent
  ],
  imports: [
    CommonModule,
    StockTontineRoutingModule,
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
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatInputModule
  ]
})
export class StockTontineModule { }
