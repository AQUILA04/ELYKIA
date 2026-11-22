import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { OrderEditPage } from './order-edit.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

const routes: Routes = [{ path: '', component: OrderEditPage }];

@NgModule({
  imports: [CommonModule, IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonSpinner, IonTitle, IonToolbar, RouterModule.forChild(routes), IfUnitPriceDirective],
  declarations: [OrderEditPage]
})
export class OrderEditPageModule { }
