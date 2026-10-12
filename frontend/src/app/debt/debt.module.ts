import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DebtRoutingModule } from './debt-routing.module';
import { DebtListComponent } from './pages/debt-list/debt-list.component';
import { DebtDetailComponent } from './pages/debt-detail/debt-detail.component';

@NgModule({
  declarations: [DebtListComponent, DebtDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    DebtRoutingModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule
  ]
})
export class DebtModule {}
