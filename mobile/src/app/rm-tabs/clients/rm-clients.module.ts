import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RmClientsPage } from './rm-clients.page';
import { RmClientEditSheetModule } from '../../features/rm/client-edit/rm-client-edit-sheet.module';

const routes: Routes = [{ path: '', component: RmClientsPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes), RmClientEditSheetModule],
  declarations: [RmClientsPage]
})
export class RmClientsPageModule {}
