import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  CustomerInitialDeposit,
  CustomerOnboardingStatus,
  MobileMoneyRecipient,
} from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent, ElykOutlinedFieldComponent } from '../../../shared/ui';
import { PaymentProofPickerComponent } from '../../../shared/components/payment-proof-picker/payment-proof-picker.component';

@Component({
  selector: 'app-onboarding-desktop',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    ElykDesktopPageComponent,
    ElykOutlinedFieldComponent,
    PaymentProofPickerComponent,
  ],
  templateUrl: './onboarding-desktop.component.html',
  styleUrls: ['./onboarding-desktop.component.scss'],
})
export class OnboardingDesktopComponent {
  readonly headerTitle = input.required<string>();
  readonly headerSubtitle = input.required<string>();
  readonly section = input.required<'menu' | 'id' | 'deposit'>();
  readonly status = input<CustomerOnboardingStatus | null>(null);
  readonly deposit = input<CustomerInitialDeposit | null>(null);
  readonly recipients = input<MobileMoneyRecipient | null>(null);
  readonly isLoading = input(false);
  readonly isSaving = input(false);
  readonly isPending = input(false);
  readonly error = input('');
  readonly success = input('');
  readonly cardPhotoDataUrl = input('');
  readonly cardTypes = input<{ value: string; label: string }[]>([]);
  readonly depositDestinationNumber = input('');
  readonly idForm = input.required<FormGroup>();
  readonly depositForm = input.required<FormGroup>();

  readonly back = output<void>();
  readonly openId = output<void>();
  readonly openDeposit = output<void>();
  readonly backToMenu = output<void>();
  readonly cardPhotoSelected = output<Event>();
  readonly submitId = output<void>();
  readonly submitDeposit = output<void>();
}
