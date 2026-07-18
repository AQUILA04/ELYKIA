import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilletageComponent } from './billetage.component';

@NgModule({
  declarations: [BilletageComponent],
  imports: [CommonModule, FormsModule],
  exports: [BilletageComponent],
})
export class BilletageModule {}
