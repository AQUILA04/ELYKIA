import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RmPlanPageRoutingModule } from './rm-plan-routing.module';
import { RmPlanPage } from './rm-plan.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonTitle, IonToolbar, RmPlanPageRoutingModule],
  declarations: [RmPlanPage]
})
export class RmPlanPageModule {}
