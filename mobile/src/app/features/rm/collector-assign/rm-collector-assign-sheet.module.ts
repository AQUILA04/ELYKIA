import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RmCollectorAssignSheetComponent } from './rm-collector-assign-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [RmCollectorAssignSheetComponent],
  exports: [RmCollectorAssignSheetComponent]
})
export class RmCollectorAssignSheetModule {}
