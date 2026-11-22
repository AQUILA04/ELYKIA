import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ngxPermissionsGuard } from 'ngx-permissions';
import { CommercialListComponent } from './commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial-view/commercial-view.component';
import { CommercialAccountsComponent } from './commercial-accounts/commercial-accounts.component';
import { CommercialAccountHistoryComponent } from './commercial-account-history/commercial-account-history.component';
import { CommercialStaffListComponent } from './commercial-staff-list/commercial-staff-list.component';
import { CommercialStaffFormComponent } from './commercial-staff-form/commercial-staff-form.component';

const staffAccess = {
  canActivate: [ngxPermissionsGuard],
  data: {
    permissions: {
      only: ['ROLE_MANAGE_COMMERCIAL_STAFF'],
      redirectTo: '/home'
    }
  }
};

const routes: Routes = [
  { path: '', redirectTo: 'accounts', pathMatch: 'full' },
  { path: 'list', component: CommercialListComponent },
  { path: 'accounts', component: CommercialAccountsComponent, ...staffAccess },
  { path: 'accounts/:userId', component: CommercialAccountHistoryComponent, ...staffAccess },
  { path: 'staff/new', component: CommercialStaffFormComponent, ...staffAccess },
  { path: 'staff/:id', component: CommercialStaffFormComponent, ...staffAccess },
  { path: 'staff', component: CommercialStaffListComponent, ...staffAccess },
  { path: 'view/:id', component: CommercialViewComponent },
  { path: 'view/:id/:username', component: CommercialViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommercialRoutingModule {}
