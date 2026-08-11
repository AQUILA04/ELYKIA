import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RmDashboardPageRoutingModule } from './rm-dashboard-routing.module';
import { RmDashboardPage } from './rm-dashboard.page';
import { RmCloseSheetModule } from '../../features/rm/close/rm-close-sheet.module';
import { RmFieldControlSheetModule } from '../../features/rm/field-control/rm-field-control-sheet.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RmDashboardPageRoutingModule,
    RmCloseSheetModule,
    RmFieldControlSheetModule
  ],
  declarations: [RmDashboardPage]
})
export class RmDashboardPageModule {}
