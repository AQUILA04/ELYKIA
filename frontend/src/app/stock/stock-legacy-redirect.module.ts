import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StockTontineRedirectComponent } from './stock-tontine-redirect.component';

const routes: Routes = [
  { path: '**', component: StockTontineRedirectComponent }
];

@NgModule({
  declarations: [StockTontineRedirectComponent],
  imports: [RouterModule.forChild(routes)]
})
export class StockLegacyRedirectModule {}
