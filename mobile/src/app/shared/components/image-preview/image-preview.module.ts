import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ImagePreviewComponent } from './image-preview.component';

@NgModule({
  declarations: [ImagePreviewComponent],
  imports: [
    CommonModule,
    IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar
  ],
  exports: [ImagePreviewComponent]
})
export class ImagePreviewComponentModule { }
