
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MobileMoneyRecipient } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent, ElykOutlinedFieldComponent } from '../../../shared/ui';

@Component({
  selector: 'app-payment-desktop',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, ElykDesktopPageComponent, ElykOutlinedFieldComponent],
  templateUrl: './payment-desktop.component.html',
  styleUrls: ['./payment-desktop.component.scss'],
})
export class PaymentDesktopComponent {
  readonly isSubmitted = input(false);
  readonly form = input.required<FormGroup>();
  readonly installmentNumber = input(0);
  readonly expectedAmount = input(0);
  readonly isLoading = input(false);
  readonly error = input('');
  readonly recipientsLoading = input(false);
  readonly recipientsError = input('');
  readonly recipients = input<MobileMoneyRecipient | null>(null);
  readonly depositDestinationNumber = input('');
  readonly hasRecipientNumbers = input(false);
  readonly back = output<void>();
  readonly submit = output<void>();
  readonly goHome = output<void>();
}
