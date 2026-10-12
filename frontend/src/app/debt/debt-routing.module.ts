import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { DebtListComponent } from './pages/debt-list/debt-list.component';
import { DebtDetailComponent } from './pages/debt-detail/debt-detail.component';

const routes: Routes = [
  {
    path: '',
    component: DebtListComponent,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_DEBT_MANAGEMENT', 'ROLE_PROMOTER', 'ROLE_STOREKEEPER', 'ROLE_ADMIN'],
        redirectTo: '/home'
      }
    }
  },
  {
    path: ':id',
    component: DebtDetailComponent,
    canActivate: [ngxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_DEBT_MANAGEMENT', 'ROLE_PROMOTER', 'ROLE_STOREKEEPER', 'ROLE_ADMIN'],
        redirectTo: '/home'
      }
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DebtRoutingModule {}
