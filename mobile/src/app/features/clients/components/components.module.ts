import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ClientMenuComponent } from './client-menu/client-menu.component';

@NgModule({
  declarations: [ClientMenuComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [ClientMenuComponent]
})
export class ComponentsModule { }
