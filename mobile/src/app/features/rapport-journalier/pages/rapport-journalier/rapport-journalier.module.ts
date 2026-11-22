import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { RapportJournalierPageRoutingModule } from './rapport-journalier-routing.module';

import { RapportJournalierPage } from './rapport-journalier.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RapportJournalierPageRoutingModule,
    RapportJournalierPage
  ]
})
export class RapportJournalierPageModule {}

