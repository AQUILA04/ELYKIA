import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { EditDistributionPageRoutingModule } from './edit-distribution-routing.module';
import { EditDistributionPage } from './edit-distribution.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonTitle, IonToolbar,
    EditDistributionPageRoutingModule,
    ScrollingModule,
    IfUnitPriceDirective
  ],
  declarations: [
    EditDistributionPage
  ]
})
export class EditDistributionPageModule {}