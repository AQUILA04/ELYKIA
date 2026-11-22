import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRouterLink,
  IonSpinner,
} from '@ionic/angular';
import { RmMorePage } from './rm-more.page';
import { RmSessionBarModule } from '../../features/rm/session-bar/rm-session-bar.module';

const routes: Routes = [{ path: '', component: RmMorePage }];

@NgModule({
  imports: [CommonModule, IonBadge, IonContent, IonIcon, IonItem, IonLabel, IonList, IonRouterLink, IonSpinner, RouterModule.forChild(routes), RmSessionBarModule],
  declarations: [RmMorePage]
})
export class RmMorePageModule {}
