import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreditListComponent } from './credit-list/credit-list.component';
import { CreditAddComponent } from './credit-add/credit-add.component';
import { CreditDetailsComponent } from './credit-details/credit-details.component';
import { CreditViewComponent } from './credit-view/credit-view.component';
import { CreditLateComponent } from './credit-late/credit-late.component';
import { CreditEcheanceComponent } from './credit-echeance/credit-echeance.component';
import { RecouvrementComponent } from './recouvrement/recouvrement.component';
import { DistributionComponent } from './distribution/distribution.component';
import { ChangeDailyStakeComponent } from './change-daily-stake/change-daily-stake.component';
import { CreateTontineComponent } from './components/create-tontine/create-tontine.component';
import { CollectorTransfersComponent } from './collector-transfers/collector-transfers.component';

const routes: Routes = [
  { path: 'list', component: CreditListComponent },
  { path: 'add', component: CreditAddComponent },
  { path: 'add/:id', component: CreditAddComponent },
  { path: 'details/:id', component: CreditDetailsComponent },
  { path: 'view/:id/:client-type', component: CreditViewComponent },
  { path: 'late', component: CreditLateComponent },
  { path: 'echeance', component: CreditEcheanceComponent },
  { path: 'recouvrements', component: RecouvrementComponent },
  { path: 'transferts-commerciaux', component: CollectorTransfersComponent },
  { path: 'change-daily-stake/:id', component: ChangeDailyStakeComponent },
  { path: 'create-tontine', component: CreateTontineComponent },
  { path: 'distribute/:id', component: DistributionComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreditRoutingModule {}
