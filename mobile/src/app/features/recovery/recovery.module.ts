import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { RecoveryPageRoutingModule } from './recovery-routing.module';
import { RecoveryPage } from './recovery.page';

// Composants
import { CreditCardComponent } from './components/credit-card/credit-card.component';
import { AmountInputComponent } from './components/amount-input/amount-input.component';
import { RecoveryListComponent } from './components/recovery-list/recovery-list.component';
import { RecoveryDetailComponent } from './components/recovery-detail/recovery-detail.component';
import { FormatNumberPipe } from '../../shared/pipes/format-number.pipe';

// Modules partagés
//import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RecoveryPageRoutingModule,
    ScrollingModule
  ],
  declarations: [
    RecoveryPage,
    CreditCardComponent,
    AmountInputComponent,
    RecoveryListComponent,
    RecoveryDetailComponent,
    FormatNumberPipe
  ]
})
export class RecoveryPageModule {}

