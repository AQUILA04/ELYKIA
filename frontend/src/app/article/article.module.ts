import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ArticleRoutingModule } from './article-routing.module';
import { AddComponent } from './add/add.component';
import { ListComponent } from './list/list.component';
import { DetailComponent } from './details/details.component';
import { StockGaugeComponent } from './details/components/stock-gauge/stock-gauge.component';
import { PriceCardComponent } from './details/components/price-card/price-card.component';
import { MovementTableComponent } from './details/components/movement-table/movement-table.component';
import { StateTimelineComponent } from './details/components/state-timeline/state-timeline.component';
import { PriceHistoryTimelineComponent } from './details/components/price-history-timeline/price-history-timeline.component';
import { QuickStockEntryComponent } from './details/components/quick-stock-entry/quick-stock-entry.component';
import { MovementListDialogComponent } from './details/components/movement-list-dialog/movement-list-dialog.component';
import { StockLotsTableComponent } from './details/components/stock-lots-table/stock-lots-table.component';

@NgModule({
  declarations: [
    AddComponent,
    ListComponent,
    DetailComponent,
    StockGaugeComponent,
    PriceCardComponent,
    MovementTableComponent,
    StateTimelineComponent,
    PriceHistoryTimelineComponent,
    QuickStockEntryComponent,
    MovementListDialogComponent,
    StockLotsTableComponent
  ],
  imports: [
    CommonModule,
    ArticleRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatCheckboxModule
  ]
})
export class ArticleModule {}
