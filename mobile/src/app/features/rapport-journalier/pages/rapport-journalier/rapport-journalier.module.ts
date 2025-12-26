import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RapportJournalierPageRoutingModule } from './rapport-journalier-routing.module';

import { RapportJournalierPage } from './rapport-journalier.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RapportJournalierPageRoutingModule,
    RapportJournalierPage
  ]
})
export class RapportJournalierPageModule {}

