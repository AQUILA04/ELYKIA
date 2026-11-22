import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpenCashDeskComponent } from './open-cash-desk/open-cash-desk.component';
import { DailyOperationComponent } from './daily-operation/daily-operation.component';
import { BilletageComponent } from './billetage/billetage.component';
import { TFJComponent } from './tfj/tfj.component';

const routes: Routes = [
  { path: 'open', component: OpenCashDeskComponent },
  { path: 'daily-operation', component: DailyOperationComponent },
  { path: 'billetage', component: BilletageComponent },
  { path: 'tfj', component: TFJComponent },
  { path: '', redirectTo: 'open', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CashDeskRoutingModule {}
