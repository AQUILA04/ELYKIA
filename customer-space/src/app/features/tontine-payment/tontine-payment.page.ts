import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { MobileMoneyRecipient } from '../../shared/models/customer.model';

/** Déclaration Mobile Money cotisation tontine. */
@Component({
  selector: 'app-tontine-payment',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule],
  templateUrl: './tontine-payment.page.html',
  styleUrls: ['./tontine-payment.page.scss'],
})
export class TontinePaymentPage implements OnInit {
  form: FormGroup;
  memberId = '';
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
    this.form = this.fb.group({
      mobileMoneyPhone: ['', Validators.required],
      mobileMoneyAmount: [null, [Validators.required, Validators.min(1)]],
      mobileMoneyReference: ['', Validators.required],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.memberId = this.route.snapshot.params['id'] ?? '';
    this.expectedAmount = Number(this.route.snapshot.queryParamMap.get('amount') ?? 0);
    if (this.expectedAmount > 0) {
      this.form.patchValue({ mobileMoneyAmount: this.expectedAmount });
    }
    void this.loadRecipients();
  }

  async loadRecipients(): Promise<void> {
    if (!this.memberId) {
      this.recipientsLoading = false;
      return;
    }
    this.recipientsLoading = true;
    this.recipientsError = '';
    try {
      this.recipients = await firstValueFrom(this.api.getTontineMobileMoneyRecipients(this.memberId));
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
      await firstValueFrom(this.api.submitTontineMobileMoneyPayment(this.memberId, {
        expectedAmount: this.expectedAmount || this.form.value.mobileMoneyAmount,
        ...this.form.value,
      }));
      this.isSubmitted = true;
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      this.error = err?.error?.message ?? 'Erreur lors de la soumission.';
    } finally {
      this.isLoading = false;
    }
  }

  goHome(): void {
    void this.router.navigate(['/dashboard']);
  }

  goTimeline(): void {
    void this.router.navigate(['/tontines', this.memberId, 'timeline']);
  }
}
