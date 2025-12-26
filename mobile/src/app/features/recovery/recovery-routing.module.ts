import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RecoveryListComponent } from './components/recovery-list/recovery-list.component';
import { RecoveryPage } from './recovery.page';

const routes: Routes = [
  {
    path: '',
    component: RecoveryPage
  },
  {
    path: 'list',
    component: RecoveryListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecoveryPageRoutingModule {}

