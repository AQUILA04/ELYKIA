import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OfferListComponent } from './pages/offer-list/offer-list.component';
import { OfferFormComponent } from './pages/offer-form/offer-form.component';
import { ApplicationListComponent } from './pages/application-list/application-list.component';
import { ApplicationDetailComponent } from './pages/application-detail/application-detail.component';

const routes: Routes = [
  { path: '', redirectTo: 'offers', pathMatch: 'full' },
  { path: 'offers', component: OfferListComponent },
  { path: 'offers/add', component: OfferFormComponent },
  { path: 'offers/edit/:id', component: OfferFormComponent },
  { path: 'applications', component: ApplicationListComponent },
  { path: 'applications/:id', component: ApplicationDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecruitmentRoutingModule {}
