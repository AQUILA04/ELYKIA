import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { HistoryRoutingModule } from './history-routing.module';
import { HistoryComponent } from './history.component';
import { HistoryDetailsComponent } from './history-details/history-details.component';
import { Back2StoreComponent } from './back2-store/back2-store.component';

@NgModule({
  declarations: [
    HistoryComponent,
    HistoryDetailsComponent,
    Back2StoreComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    SharedComponentsModule,
    HistoryRoutingModule
  ]
})
export class HistoryModule {}
