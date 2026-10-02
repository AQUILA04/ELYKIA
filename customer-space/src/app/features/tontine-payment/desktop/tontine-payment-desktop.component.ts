
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MobileMoneyRecipient } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent, ElykOutlinedFieldComponent } from '../../../shared/ui';
import { MobileMoneyRecipientsCardComponent } from '../../../shared/components/mobile-money-recipients-card/mobile-money-recipients-card.component';
import { PaymentProofPickerComponent } from '../../../shared/components/payment-proof-picker/payment-proof-picker.component';

@Component({
  selector: 'app-tontine-payment-desktop',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonicModule,
    ElykDesktopPageComponent, ElykOutlinedFieldComponent, MobileMoneyRecipientsCardComponent,
    PaymentProofPickerComponent,
  ],
  templateUrl: './tontine-payment-desktop.component.html',
  styleUrls: ['./tontine-payment-desktop.component.scss'],
})
export class TontinePaymentDesktopComponent {
  readonly isSubmitted = input(false);
  readonly form = input.required<FormGroup>();
  readonly expectedAmount = input(0);
  readonly isLoading = input(false);
  readonly error = input('');
  readonly recipients = input<MobileMoneyRecipient | null>(null);
  readonly recipientsLoading = input(false);
  readonly recipientsError = input('');
  readonly depositDestinationNumber = input('');
  readonly back = output<void>();
  readonly submit = output<void>();
  readonly goBackSuccess = output<void>();
}
