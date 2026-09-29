import { Component, OnInit , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { MobileMoneyRecipient } from '../../shared/models/customer.model';
import {
  createMobileMoneyPaymentForm,
  mobileMoneySubmitErrorMessage,
} from '../../shared/utils/mobile-money-form';
import { ElykPageHeaderComponent, ElykOutlinedFieldComponent } from '../../shared/ui';

const FALLBACK_DEPOSIT_NUMBER = '96186822';

/** Page Paiement Mobile Money — Type C. */
import { LayoutService } from '../../shared/layout/layout.service';
import { PaymentDesktopComponent } from './desktop/payment-desktop.component';
@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    PaymentDesktopComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterModule,
    ElykPageHeaderComponent,
    ElykOutlinedFieldComponent,
  ],
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  readonly layout = inject(LayoutService);
  form: FormGroup;
  distributionId = '';
  installmentNumber = 0;
  expectedAmount = 0;
  isLoading = false;
  isSubmitted = false;
  error = '';
  recipientsLoading = true;
  recipientsError = '';
  recipients: MobileMoneyRecipient | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private api: CustomerApiService,
  ) {
    this.form = createMobileMoneyPaymentForm(this.fb);
  }

  ngOnInit(): void {
    this.distributionId = this.route.snapshot.params['id'] ?? '';
    const q = this.route.snapshot.queryParamMap;
    this.installmentNumber = Number(q.get('installment') ?? 0);
    this.expectedAmount = Number(q.get('amount') ?? 0);
    if (this.expectedAmount > 0) {
      this.form.patchValue({ mobileMoneyAmount: this.expectedAmount });
    }
    void this.loadRecipients();
  }

  get depositDestinationNumber(): string {
    const mixx = this.recipients?.mixxNumber?.trim();
    if (mixx) return mixx;
    const moov = this.recipients?.moovNumber?.trim();
    if (moov) return moov;
    return FALLBACK_DEPOSIT_NUMBER;
  }

  async loadRecipients(): Promise<void> {
    if (!this.distributionId) {
      this.recipientsLoading = false;
      return;
    }
    this.recipientsLoading = true;
    this.recipientsError = '';
    try {
      this.recipients = await firstValueFrom(this.api.getMobileMoneyRecipients(this.distributionId));
    } catch {
      this.recipientsError = 'Impossible de charger les numéros de paiement.';
    } finally {
      this.recipientsLoading = false;
    }
  }

  hasRecipientNumbers(): boolean {
    return !!(this.recipients?.mixxNumber || this.recipients?.moovNumber);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.error = '';
    try {
      await firstValueFrom(this.api.submitMobileMoneyPayment({
        distributionId: this.distributionId,
        installmentNumber: this.installmentNumber,
        expectedAmount: this.expectedAmount,
        ...this.form.value,
      }));
      this.isSubmitted = true;
    } catch (e: unknown) {
      this.error = mobileMoneySubmitErrorMessage(e, 'Erreur lors de la soumission.');
    } finally {
      this.isLoading = false;
    }
  }

  goHome(): void {
    void this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    void this.router.navigate(['/purchases', this.distributionId, 'timeline']);
  }
}
