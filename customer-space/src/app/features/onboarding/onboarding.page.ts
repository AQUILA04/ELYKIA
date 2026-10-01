import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import {
  CustomerInitialDeposit,
  CustomerOnboardingStatus,
  MobileMoneyRecipient,
} from '../../shared/models/customer.model';
import { CARD_TYPE_OPTIONS } from '../../shared/models/customer-auth.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { ElykOutlinedFieldComponent, ElykPageHeaderComponent } from '../../shared/ui';

const FALLBACK_DEPOSIT_NUMBER = '96186822';

/** Page Mon dossier — Type C. */
import { LayoutService } from '../../shared/layout/layout.service';
import { OnboardingDesktopComponent } from './desktop/onboarding-desktop.component';
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    OnboardingDesktopComponent,
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule,
    CustomerTabBarComponent,
    ElykPageHeaderComponent,
    ElykOutlinedFieldComponent,
  ],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage implements ViewWillEnter {
  readonly layout = inject(LayoutService);
  private readonly journal = inject(UserJournalService);
  status: CustomerOnboardingStatus | null = null;
  deposit: CustomerInitialDeposit | null = null;
  recipients: MobileMoneyRecipient | null = null;
  isLoading = true;
  isSaving = false;
  error = '';
  success = '';
  cardPhotoDataUrl = '';
  readonly cardTypes = CARD_TYPE_OPTIONS;
  section: 'menu' | 'id' | 'deposit' = 'menu';

  idForm: FormGroup;
  depositForm: FormGroup;

  constructor(
    private api: CustomerApiService,
    private session: CustomerSessionService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.idForm = this.fb.group({
      cardType: ['', Validators.required],
      cardID: ['', [Validators.required, Validators.maxLength(100)]],
    });
    this.depositForm = this.fb.group({
      mobileMoneyPhone: ['', [Validators.required, Validators.minLength(8)]],
      mobileMoneyAmount: ['', [Validators.required, Validators.min(500), Validators.max(2000000)]],
      mobileMoneyReference: ['', Validators.required],
      notes: [''],
    });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  get isPending(): boolean {
    return this.status?.activationStatus === 'PENDING';
  }

  get headerTitle(): string {
    if (this.section === 'id') return 'Pièce d\'identité';
    if (this.section === 'deposit') return 'Dépôt initial';
    return 'Compléter mon dossier';
  }

  get headerSubtitle(): string {
    if (this.section === 'id') return 'Ajoutez la photo de votre pièce';
    if (this.section === 'deposit') return 'Déclarez votre transfert Mobile Money';
    return 'Pièce d\'identité et dépôt pour accélérer l\'activation';
  }

  get depositDestinationNumber(): string {
    const mixx = this.recipients?.mixxNumber?.trim();
    if (mixx) return mixx;
    const moov = this.recipients?.moovNumber?.trim();
    if (moov) return moov;
    return FALLBACK_DEPOSIT_NUMBER;
  }

  onHeaderBack(): void {
    if (this.section === 'menu') {
      this.goDashboard();
      return;
    }
    this.backToMenu();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      this.status = await firstValueFrom(this.api.getOnboardingStatus());
      this.session.updateActivationStatus(this.status.activationStatus);
      this.idForm.patchValue({
        cardType: this.status.cardType ?? '',
        cardID: this.status.cardID ?? '',
      });
      if (this.isPending) {
        try {
          this.deposit = await firstValueFrom(this.api.getInitialDeposit());
        } catch {
          this.deposit = null;
        }
        this.recipients = await firstValueFrom(this.api.getInitialDepositRecipients());
      }
    } catch (e: unknown) {
      this.error = this.extractError(e);
    } finally {
      this.isLoading = false;
    }
  }

  openId(): void {
    this.section = 'id';
    this.error = '';
    this.success = '';
  }

  openDeposit(): void {
    this.section = 'deposit';
    this.error = '';
    this.success = '';
  }

  backToMenu(): void {
    this.section = 'menu';
    this.error = '';
    this.success = '';
  }

  onCardPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.cardPhotoDataUrl = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  async submitIdDocument(): Promise<void> {
    if (this.idForm.invalid) {
      this.idForm.markAllAsTouched();
      this.error = 'Indiquez le type et le numéro de votre pièce d\'identité.';
      return;
    }
    if (!this.cardPhotoDataUrl) {
      this.error = 'La photo de la pièce est obligatoire.';
      return;
    }
    this.isSaving = true;
    this.error = '';
    this.success = '';
    try {
      this.status = await firstValueFrom(this.api.uploadIdDocument({
        cardType: this.idForm.value.cardType,
        cardID: this.idForm.value.cardID,
        cardPhoto: this.cardPhotoDataUrl,
      }));
      this.success = 'Pièce d\'identité enregistrée.';
      this.section = 'menu';
      this.cardPhotoDataUrl = '';
      this.journal.track('ONBOARDING_DOC_UPLOADED', 'BUSINESS');
    } catch (e: unknown) {
      this.error = this.extractError(e);
    } finally {
      this.isSaving = false;
    }
  }

  async submitDeposit(): Promise<void> {
    if (this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    this.error = '';
    this.success = '';
    try {
      this.deposit = await firstValueFrom(this.api.submitInitialDeposit({
        mobileMoneyPhone: this.depositForm.value.mobileMoneyPhone,
        mobileMoneyAmount: Number(this.depositForm.value.mobileMoneyAmount),
        mobileMoneyReference: this.depositForm.value.mobileMoneyReference,
        notes: this.depositForm.value.notes || undefined,
      }));
      this.success = 'Déclaration de dépôt envoyée.';
      this.section = 'menu';
      this.journal.track('INITIAL_DEPOSIT_SUBMITTED', 'BUSINESS', {
        amount: Number(this.depositForm.value.mobileMoneyAmount),
      });
      await this.load();
    } catch (e: unknown) {
      this.error = this.extractError(e);
    } finally {
      this.isSaving = false;
    }
  }

  goDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private extractError(e: unknown): string {
    if (e && typeof e === 'object' && 'error' in e) {
      const err = (e as { error?: { message?: string } }).error;
      if (err?.message) return err.message;
    }
    return 'Une erreur est survenue.';
  }
}
