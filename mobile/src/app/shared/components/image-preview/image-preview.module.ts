import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ImagePreviewComponent } from './image-preview.component';

@NgModule({
  declarations: [ImagePreviewComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [ImagePreviewComponent]
})
export class ImagePreviewComponentModule { }
