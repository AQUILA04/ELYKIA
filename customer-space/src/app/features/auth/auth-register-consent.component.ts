import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  parseCustomerTerms,
  REGISTER_CONSENT_BACK,
  REGISTER_CONSENT_BODY,
} from './customer-terms';

/** Étape d'acceptation des conditions, partagée entre mobile et bureau. */
@Component({
  selector: 'app-auth-register-consent',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './auth-register-consent.component.html',
  styleUrls: ['./auth-register-consent.component.scss'],
})
export class AuthRegisterConsentComponent {
  readonly termsOpen = input(false);
  readonly termsAccepted = input(false);
  readonly isLoading = input(false);
  readonly error = input('');

  readonly toggleTerms = output<void>();
  readonly termsAcceptedChange = output<boolean>();
  readonly back = output<void>();
  readonly continueRegistration = output<void>();

  readonly consentBody = REGISTER_CONSENT_BODY;
  readonly consentBack = REGISTER_CONSENT_BACK;
  readonly termsSections = parseCustomerTerms();

  onTermsCheckbox(event: Event): void {
    const checked = (event as CustomEvent<{ checked?: boolean }>).detail?.checked === true;
    this.termsAcceptedChange.emit(checked);
  }
}
