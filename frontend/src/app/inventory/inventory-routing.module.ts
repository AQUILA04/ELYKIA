import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { InventoryComponent } from './inventory/inventory.component';
import { AddInventoryComponent } from './inventory-add/inventory-add.component';
import { InventoryReconciliationComponent } from './inventory-reconciliation/inventory-reconciliation.component';
import { InventoryHistoryComponent } from './inventory-history/inventory-history.component';
import { InventoryHistoryDetailComponent } from './inventory-history-detail/inventory-history-detail.component';
import { InventoryTrajectoryComponent } from './inventory-trajectory/inventory-trajectory.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: InventoryComponent },
  { path: 'add', component: AddInventoryComponent },
  {
    path: 'history',
    component: InventoryHistoryComponent,
    canActivate: [NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_CONSULT_INVENTORY_HISTORY'],
        redirectTo: '/home',
      },
    },
  },
  {
    path: 'history/:id',
    component: InventoryHistoryDetailComponent,
    canActivate: [NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_CONSULT_INVENTORY_HISTORY'],
        redirectTo: '/home',
      },
    },
  },
  {
    path: 'trajectory/:itemId',
    component: InventoryTrajectoryComponent,
    canActivate: [NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_CONSULT_INVENTORY_HISTORY'],
        redirectTo: '/home',
      },
    },
  },
  {
    path: 'reconciliation/:id',
    component: InventoryReconciliationComponent,
    canActivate: [NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_RECONCILE_INVENTORY', 'ROLE_REPORT'],
        redirectTo: '/home',
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InventoryRoutingModule {}
