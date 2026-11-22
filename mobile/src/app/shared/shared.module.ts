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
  IonCheckbox,
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
import { IfUnitPriceDirective } from './directives/if-unit-price.directive';
import { IfNoUnitPriceDirective } from './directives/if-no-unit-price.directive';

import { BaseTransactionComponent } from './components/base-transaction/base-transaction.component';
import { ArticleSelectorComponent } from './components/article-selector/article-selector.component';
import { ClientDisplayComponent } from './components/client-display/client-display.component';
import { ReliquatDisplayComponent } from './components/reliquat-display/reliquat-display.component';

@NgModule({
  declarations: [
    BaseTransactionComponent,
    ArticleSelectorComponent,
    ClientDisplayComponent,
    ReliquatDisplayComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonTitle, IonToolbar,
    ScrollingModule,
    IfUnitPriceDirective,
    IfNoUnitPriceDirective
  ],
  exports: [
    BaseTransactionComponent,
    ArticleSelectorComponent,
    ClientDisplayComponent,
    ReliquatDisplayComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    IfUnitPriceDirective,
    IfNoUnitPriceDirective
  ]
})
export class SharedModule { }