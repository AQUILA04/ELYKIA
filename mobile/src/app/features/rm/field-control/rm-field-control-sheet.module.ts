import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput, IonTextarea } from '@ionic/angular';
import { MiseDayPillsModule } from '../../../shared/components/mise-day-pills/mise-day-pills.module';
import { RmFieldControlSheetComponent } from './rm-field-control-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonInput, IonTextarea, MiseDayPillsModule],
  declarations: [RmFieldControlSheetComponent],
  exports: [RmFieldControlSheetComponent]
})
export class RmFieldControlSheetModule {}
