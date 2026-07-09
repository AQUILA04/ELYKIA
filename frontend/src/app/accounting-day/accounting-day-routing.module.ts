import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingDayComponent } from './accounting-day.component';

const routes: Routes = [
  { path: '', component: AccountingDayComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountingDayRoutingModule {}
