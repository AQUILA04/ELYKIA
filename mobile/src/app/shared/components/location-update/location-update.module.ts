import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LocationUpdateComponent } from './location-update.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  declarations: [LocationUpdateComponent],
  exports: [LocationUpdateComponent]
})
export class LocationUpdateModule {}
