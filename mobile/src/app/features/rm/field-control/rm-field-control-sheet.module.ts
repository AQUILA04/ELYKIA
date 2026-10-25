import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MiseDayPillsModule } from '../../../shared/components/mise-day-pills/mise-day-pills.module';
import { RmFieldControlSheetComponent } from './rm-field-control-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, MiseDayPillsModule],
  declarations: [RmFieldControlSheetComponent],
  exports: [RmFieldControlSheetComponent]
})
export class RmFieldControlSheetModule {}
