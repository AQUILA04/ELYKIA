import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonChip, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { RmDashboardPageRoutingModule } from './rm-dashboard-routing.module';
import { RmDashboardPage } from './rm-dashboard.page';
import { RmCloseSheetModule } from '../../features/rm/close/rm-close-sheet.module';
import { RmFieldControlSheetModule } from '../../features/rm/field-control/rm-field-control-sheet.module';
import { RmSessionBarModule } from '../../features/rm/session-bar/rm-session-bar.module';

@NgModule({
  imports: [
    CommonModule,
    IonButton, IonChip, IonContent, IonIcon, IonSpinner,
    RmDashboardPageRoutingModule,
    RmCloseSheetModule,
    RmFieldControlSheetModule,
    RmSessionBarModule
  ],
  declarations: [RmDashboardPage]
})
export class RmDashboardPageModule {}
