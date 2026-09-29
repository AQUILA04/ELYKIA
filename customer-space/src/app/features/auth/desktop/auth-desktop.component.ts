import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthStep, CustomerLocality } from '../../../shared/models/customer-auth.model';
import { ElykLocalityPickerComponent, ElykOutlinedFieldComponent } from '../../../shared/ui';

@Component({
  selector: 'app-auth-desktop',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    ElykOutlinedFieldComponent,
    ElykLocalityPickerComponent,
  ],
  templateUrl: './auth-desktop.component.html',
  styleUrls: ['./auth-desktop.component.scss'],
})
export class AuthDesktopComponent {
  readonly step = input.required<AuthStep>();
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly error = input('');
  readonly appUnavailable = input(false);
  readonly appUnavailableMessage = input('');
  readonly isLoading = input(false);
  readonly appVersion = input('');
  readonly profilPhotoDataUrl = input('');
  readonly cardTypes = input<{ value: string; label: string }[]>([]);
  readonly otpReference = input('');
  readonly resendCountdown = input(0);
  readonly resendLabel = input('Renvoyer le code');
  readonly canResendOtp = input(false);
  readonly phoneHint = input('');
  readonly localities = input<CustomerLocality[]>([]);
  readonly localitiesLoading = input(false);
  readonly localitiesError = input('');

  readonly phoneForm = input.required<FormGroup>();
  readonly pinForm = input.required<FormGroup>();
  readonly otpForm = input.required<FormGroup>();
  readonly setupPinForm = input.required<FormGroup>();
  readonly registerForm = input.required<FormGroup>();
  readonly registerPinForm = input.required<FormGroup>();

  readonly submitPhone = output<void>();
  readonly submitPin = output<void>();
  readonly submitOtp = output<void>();
  readonly resendOtp = output<void>();
  readonly submitSetupPin = output<void>();
  readonly submitRegisterForm = output<void>();
  readonly submitRegisterPin = output<void>();
  readonly profilPhotoSelected = output<Event>();
  readonly retryLocalities = output<void>();
  readonly back = output<void>();

  readonly benefits = [
    { icon: 'cash-outline', title: 'Suivez vos crédits', text: 'Visualisez vos mises et votre progression en temps réel.' },
    { icon: 'bag-add-outline', title: 'Commandez en ligne', text: 'Parcourez le catalogue et passez commande depuis chez vous.' },
    { icon: 'albums-outline', title: 'Gérez votre tontine', text: 'Cotisez et suivez votre épargne jusqu’à la livraison.' },
  ];
}
