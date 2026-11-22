import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistoryComponent } from './history.component';
import { HistoryDetailsComponent } from './history-details/history-details.component';
import { Back2StoreComponent } from './back2-store/back2-store.component';

const routes: Routes = [
  { path: 'list', component: HistoryComponent },
  { path: 'details/:id', component: HistoryDetailsComponent },
  { path: 'back-store/:id', component: Back2StoreComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HistoryRoutingModule {}
