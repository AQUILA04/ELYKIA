import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { RmSessionBarComponent } from './rm-session-bar.component';

@NgModule({
  imports: [CommonModule, IonIcon],
  declarations: [RmSessionBarComponent],
  exports: [RmSessionBarComponent]
})
export class RmSessionBarModule {}
