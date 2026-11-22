import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput } from '@ionic/angular';
import { RmClientEditSheetComponent } from './rm-client-edit-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonInput],
  declarations: [RmClientEditSheetComponent],
  exports: [RmClientEditSheetComponent]
})
export class RmClientEditSheetModule {}
