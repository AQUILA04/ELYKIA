import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RmTontineFieldControlSheetComponent } from './rm-tontine-field-control-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [RmTontineFieldControlSheetComponent],
  exports: [RmTontineFieldControlSheetComponent]
})
export class RmTontineFieldControlSheetModule {}
