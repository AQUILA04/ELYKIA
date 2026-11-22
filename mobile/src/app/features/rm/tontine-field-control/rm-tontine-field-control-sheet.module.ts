import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular';
import { MiseDayPillsModule } from '../../../shared/components/mise-day-pills/mise-day-pills.module';
import { RmTontineFieldControlSheetComponent } from './rm-tontine-field-control-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonButton, IonCheckbox, IonIcon, IonInput, IonSelect, IonSelectOption, IonTextarea, MiseDayPillsModule],
  declarations: [RmTontineFieldControlSheetComponent],
  exports: [RmTontineFieldControlSheetComponent]
})
export class RmTontineFieldControlSheetModule {}
