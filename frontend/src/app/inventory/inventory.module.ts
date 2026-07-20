import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryComponent } from './inventory/inventory.component';
import { AddInventoryComponent } from './inventory-add/inventory-add.component';
import { InventoryReconciliationComponent } from './inventory-reconciliation/inventory-reconciliation.component';
import { PhysicalQuantityModalComponent } from './physical-quantity-modal/physical-quantity-modal.component';
import { InventoryHistoryComponent } from './inventory-history/inventory-history.component';
import { InventoryHistoryDetailComponent } from './inventory-history-detail/inventory-history-detail.component';
import { InventoryTrajectoryComponent } from './inventory-trajectory/inventory-trajectory.component';

@NgModule({
  declarations: [
    InventoryComponent,
    AddInventoryComponent,
    InventoryReconciliationComponent,
    PhysicalQuantityModalComponent,
    InventoryHistoryComponent,
    InventoryHistoryDetailComponent,
    InventoryTrajectoryComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InventoryRoutingModule,
    NgxPermissionsModule,
    SharedComponentsModule,
    MatPaginatorModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class InventoryModule {}
