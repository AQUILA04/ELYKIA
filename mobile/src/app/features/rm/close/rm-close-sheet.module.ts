import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RmCloseSheetComponent } from './rm-close-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [RmCloseSheetComponent],
  exports: [RmCloseSheetComponent]
})
export class RmCloseSheetModule {}
