import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RmFieldPage } from './rm-field.page';
import { RmTontineFieldControlSheetModule } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.module';

const routes: Routes = [{ path: '', component: RmFieldPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), RmTontineFieldControlSheetModule],
  declarations: [RmFieldPage]
})
export class RmFieldPageModule {}
