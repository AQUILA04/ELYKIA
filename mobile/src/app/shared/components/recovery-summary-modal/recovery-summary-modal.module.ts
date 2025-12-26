import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
// import { RecoverySummaryModalComponent } from './recovery-summary-modal.component';

@NgModule({
  // declarations: [RecoverySummaryModalComponent],
  imports: [
    IonicModule,
    CommonModule

  ],
  // exports: [RecoverySummaryModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RecoverySummaryModalModule { }
