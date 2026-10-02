
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  CustomerTontineJoinResponse,
  CustomerTontineSession,
  MobileMoneyRecipient,
} from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent, ElykOutlinedFieldComponent } from '../../../shared/ui';
import { MobileMoneyRecipientsCardComponent } from '../../../shared/components/mobile-money-recipients-card/mobile-money-recipients-card.component';

@Component({
  selector: 'app-tontine-join-desktop',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonicModule, RouterModule,
    ElykDesktopPageComponent, ElykOutlinedFieldComponent, MobileMoneyRecipientsCardComponent,
  ],
  templateUrl: './tontine-join-desktop.component.html',
  styleUrls: ['./tontine-join-desktop.component.scss'],
})
export class TontineJoinDesktopComponent {
  readonly stakeShortcuts = input<number[]>([]);
  readonly session = input<CustomerTontineSession | null>(null);
  readonly stakeForm = input.required<FormGroup>();
  readonly paymentForm = input.required<FormGroup>();
  readonly includeInitialPayment = input(false);
  readonly recipients = input<MobileMoneyRecipient | null>(null);
  readonly recipientsLoading = input(false);
  readonly recipientsError = input('');
  readonly isLoadingSession = input(false);
  readonly isSubmitting = input(false);
  readonly error = input('');
  readonly success = input<CustomerTontineJoinResponse | null>(null);
  readonly selectedShortcut = input<number | null>(null);
  readonly depositDestinationNumber = input('');
  readonly estimatedTotal = input(0);
  readonly estimatedMonths = input(0);
  readonly monthlyEstimate = input(0);
  readonly back = output<void>();
  readonly selectShortcut = output<number>();
  readonly togglePayment = output<boolean>();
  readonly submit = output<void>();
  readonly goDetail = output<void>();
}
