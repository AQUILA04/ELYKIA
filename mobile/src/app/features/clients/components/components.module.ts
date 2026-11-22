import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular';
import { ClientMenuComponent } from './client-menu/client-menu.component';

@NgModule({
  declarations: [ClientMenuComponent],
  imports: [
    CommonModule,
    IonIcon, IonItem, IonLabel, IonList
  ],
  exports: [ClientMenuComponent]
})
export class ComponentsModule { }
