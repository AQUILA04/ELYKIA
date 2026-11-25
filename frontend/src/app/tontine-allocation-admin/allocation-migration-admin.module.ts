import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AllocationMigrationAdminComponent } from './allocation-migration-admin.component';

const routes: Routes = [{ path: '', component: AllocationMigrationAdminComponent }];

@NgModule({
  declarations: [AllocationMigrationAdminComponent],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class AllocationMigrationAdminModule {}
