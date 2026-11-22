import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
} from '@ionic/angular';
import { RmFieldPage } from './rm-field.page';
import { RmFieldControlSheetModule } from '../../features/rm/field-control/rm-field-control-sheet.module';
import { RmTontineFieldControlSheetModule } from '../../features/rm/tontine-field-control/rm-tontine-field-control-sheet.module';

const routes: Routes = [{ path: '', component: RmFieldPage }];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonButton, IonCheckbox, IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSearchbar,
    RouterModule.forChild(routes),
    RmTontineFieldControlSheetModule,
    RmFieldControlSheetModule
  ],
  declarations: [RmFieldPage]
})
export class RmFieldPageModule {}
