import { Component , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import {
  CustomerTontineJoinResponse,
  CustomerTontineSession,
  MobileMoneyRecipient,
} from '../../shared/models/customer.model';
import {
  createMobileMoneyPaymentForm,
  mobileMoneySubmitErrorMessage,
} from '../../shared/utils/mobile-money-form';
import { ElykPageHeaderComponent, ElykOutlinedFieldComponent } from '../../shared/ui';
import { MobileMoneyRecipientsCardComponent } from '../../shared/components/mobile-money-recipients-card/mobile-money-recipients-card.component';
import { PaymentProofPickerComponent } from '../../shared/components/payment-proof-picker/payment-proof-picker.component';

const STAKE_SHORTCUTS = [100, 200, 500, 1000];
/** Numéro agence affiché si aucun destinataire Mixx/Moov n'est configuré. */
const FALLBACK_DEPOSIT_NUMBER = '96186822';

import { LayoutService } from '../../shared/layout/layout.service';
import { TontineJoinDesktopComponent } from './desktop/tontine-join-desktop.component';
@Component({
  selector: 'app-tontine-join',
  standalone: true,
  imports: [
    TontineJoinDesktopComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterModule,
    ElykPageHeaderComponent,
    ElykOutlinedFieldComponent,
    MobileMoneyRecipientsCardComponent,
    PaymentProofPickerComponent,
  ],
  templateUrl: './tontine-join.page.html',
  styleUrls: ['./tontine-join.page.scss'],
})
export class TontineJoinPage implements ViewWillEnter {
  readonly layout = inject(LayoutService);
  private readonly journal = inject(UserJournalService);
  readonly stakeShortcuts = STAKE_SHORTCUTS;
  session: CustomerTontineSession | null = null;
  stakeForm: FormGroup;
  paymentForm: FormGroup;
  includeInitialPayment = false;
  recipients: MobileMoneyRecipient | null = null;
  recipientsLoading = false;
  recipientsError = '';
  isLoadingSession = true;
  isSubmitting = false;
  error = '';
  success: CustomerTontineJoinResponse | null = null;
  selectedShortcut: number | null = 100;

  constructor(
    private api: CustomerApiService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.stakeForm = this.fb.group({
      dailyStake: [100, [Validators.required, Validators.min(100)]],
    });
    this.paymentForm = createMobileMoneyPaymentForm(this.fb);
  }

  /** Reconfirme côté backend que l'utilisateur n'est pas déjà membre avant le formulaire. */
  ionViewWillEnter(): void {
    if (this.success) {
      return;
    }
    void this.loadSession();
  }

  async loadSession(): Promise<void> {
    this.isLoadingSession = true;
    this.error = '';
    try {
      // Toujours confirmer côté backend avant d'afficher le formulaire d'inscription.
      this.session = await firstValueFrom(this.api.getCurrentTontineSession());
      if (this.session.alreadyMember && this.session.memberId) {
        void this.router.navigate(['/tontines', this.session.memberId], { replaceUrl: true });
        return;
      }
      if (!this.session.joinable) {
        this.error = 'Aucune session de tontine ouverte.';
      }
      const min = this.session.minDailyStake || 100;
      this.stakeForm.get('dailyStake')?.setValidators([Validators.required, Validators.min(min)]);
      this.stakeForm.patchValue({ dailyStake: Math.max(100, min) });
      this.selectedShortcut = 100;
      // Précharger les numéros pour afficher la destination du premier dépôt.
      void this.loadRecipients();
    } catch {
      this.error = 'Impossible de charger la session.';
    } finally {
      this.isLoadingSession = false;
    }
  }

  get dailyStake(): number {
    return Number(this.stakeForm.value.dailyStake) || 0;
  }

  /** Un mois tontine compte toujours 31 jours de mise. */
  get monthlyEstimate(): number {
    return this.dailyStake * 31;
  }

  /**
   * Numéro d'envoi du premier dépôt : Mixx, sinon Moov, sinon numéro agence par défaut.
   */
  get depositDestinationNumber(): string {
    const mixx = this.recipients?.mixxNumber?.trim();
    if (mixx) {
      return mixx;
    }
    const moov = this.recipients?.moovNumber?.trim();
    if (moov) {
      return moov;
    }
    return FALLBACK_DEPOSIT_NUMBER;
  }

  selectShortcut(amount: number): void {
    this.selectedShortcut = amount;
    this.stakeForm.patchValue({ dailyStake: amount });
    if (this.includeInitialPayment) {
      this.paymentForm.patchValue({ mobileMoneyAmount: amount });
    }
  }

  onStakeInput(): void {
    const value = this.dailyStake;
    this.selectedShortcut = this.stakeShortcuts.includes(value) ? value : null;
    if (this.includeInitialPayment && value >= 100) {
      this.paymentForm.patchValue({ mobileMoneyAmount: value });
    }
  }

  async toggleInitialPayment(enabled: boolean): Promise<void> {
    this.includeInitialPayment = enabled;
    if (!enabled) {
      return;
    }
    this.paymentForm.patchValue({ mobileMoneyAmount: this.dailyStake || 100 });
    await this.loadRecipients();
  }

  async loadRecipients(): Promise<void> {
    this.recipientsLoading = true;
    this.recipientsError = '';
    try {
      this.recipients = await firstValueFrom(this.api.getTontineJoinRecipients());
    } catch {
      this.recipientsError = 'Impossible de charger les numéros de paiement.';
    } finally {
      this.recipientsLoading = false;
    }
  }

  canSubmit(): boolean {
    if (this.stakeForm.invalid || this.isSubmitting || !this.session?.joinable) {
      return false;
    }
    if (this.includeInitialPayment && this.paymentForm.invalid) {
      return false;
    }
    return true;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) {
      this.stakeForm.markAllAsTouched();
      if (this.includeInitialPayment) {
        this.paymentForm.markAllAsTouched();
      }
      return;
    }
    this.isSubmitting = true;
    this.error = '';
    try {
      const payload: {
        dailyStake: number;
        initialPayment?: {
          mobileMoneyPhone: string;
          mobileMoneyAmount: number;
          mobileMoneyReference: string;
          notes?: string;
        };
      } = { dailyStake: this.dailyStake };
      if (this.includeInitialPayment) {
        payload.initialPayment = {
          mobileMoneyPhone: this.paymentForm.value.mobileMoneyPhone,
          mobileMoneyAmount: this.paymentForm.value.mobileMoneyAmount,
          mobileMoneyReference: this.paymentForm.value.mobileMoneyReference,
          notes: this.paymentForm.value.notes || undefined,
          paymentProofId: this.paymentForm.value.paymentProofId,
        };
      }
      this.success = await firstValueFrom(this.api.joinTontineSession(payload));
      this.journal.track('TONTINE_JOIN', 'BUSINESS', {
        dailyStake: this.dailyStake,
        withInitialPayment: this.includeInitialPayment,
      });
    } catch (e: unknown) {
      this.error = mobileMoneySubmitErrorMessage(e, 'Impossible de finaliser l’inscription.');
    } finally {
      this.isSubmitting = false;
    }
  }

  goToTontine(): void {
    if (!this.success?.memberId) {
      return;
    }
    void this.router.navigate(['/tontines', this.success.memberId]);
  }

  goHome(): void {
    void this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    void this.router.navigate(['/tontines']);
  }

  fieldError(controlName: string, form: FormGroup = this.paymentForm): string {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.invalid) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }
    if (control.hasError('min')) {
      return 'Montant minimum : 100 FCFA.';
    }
    return 'Valeur invalide.';
  }
}
