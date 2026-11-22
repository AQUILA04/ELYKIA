import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput } from '@ionic/angular';
import { RmCloseSheetComponent } from './rm-close-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonInput],
  declarations: [RmCloseSheetComponent],
  exports: [RmCloseSheetComponent]
})
export class RmCloseSheetModule {}
