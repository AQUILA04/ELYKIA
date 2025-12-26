import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { BaseTransactionComponent } from './components/base-transaction/base-transaction.component';
import { ArticleSelectorComponent } from './components/article-selector/article-selector.component';
import { ClientDisplayComponent } from './components/client-display/client-display.component';

@NgModule({
  declarations: [
    BaseTransactionComponent,
    ArticleSelectorComponent,
    ClientDisplayComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ScrollingModule
  ],
  exports: [
    BaseTransactionComponent,
    ArticleSelectorComponent,
    ClientDisplayComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ScrollingModule
  ]
})
export class SharedModule { }