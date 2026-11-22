import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CarnetEcartListComponent } from './pages/carnet-ecart-list/carnet-ecart-list.component';

const routes: Routes = [
  { path: '', component: CarnetEcartListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CarnetEcartRoutingModule {}
