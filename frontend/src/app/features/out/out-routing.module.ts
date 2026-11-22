import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OutListComponent } from './out-list/out-list.component';
import { OutDetailsComponent } from './out-details/out-details.component';
import { OutPdfListComponent } from './out-pdf-list/out-pdf-list.component';
import { OldReleaseListComponent } from './old-release-list/old-release-list.component';

const routes: Routes = [
  { path: 'list', component: OutListComponent },
  { path: 'details/:id', component: OutDetailsComponent },
  { path: 'pdf-list', component: OutPdfListComponent },
  { path: 'old-release-list', component: OldReleaseListComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OutRoutingModule {}
