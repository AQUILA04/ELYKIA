import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatPaginatorModule } from '@angular/material/paginator';
import { CustomerActivityAuditRoutingModule } from './customer-activity-audit-routing.module';
import { ActivityLogListComponent } from './pages/activity-log-list/activity-log-list.component';

@NgModule({
  declarations: [ActivityLogListComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatPaginatorModule,
    CustomerActivityAuditRoutingModule,
  ],
})
export class CustomerActivityAuditModule {}
