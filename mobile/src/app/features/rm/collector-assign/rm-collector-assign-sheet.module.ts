import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCheckbox, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular';
import { RmCollectorAssignSheetComponent } from './rm-collector-assign-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonCheckbox, IonIcon, IonSelect, IonSelectOption],
  declarations: [RmCollectorAssignSheetComponent],
  exports: [RmCollectorAssignSheetComponent]
})
export class RmCollectorAssignSheetModule {}
