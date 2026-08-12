import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RmSessionBarComponent } from './rm-session-bar.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [RmSessionBarComponent],
  exports: [RmSessionBarComponent]
})
export class RmSessionBarModule {}
