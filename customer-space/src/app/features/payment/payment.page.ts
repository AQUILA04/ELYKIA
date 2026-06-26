import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';

/** Page Paiement Mobile Money — S-07, S-08. */
@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  form: FormGroup;
  distributionId = '';
  installmentNumber = 0;
  expectedAmount = 0;
  isLoading = false;
  isSubmitted = false;
  error = '';

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
    this.distributionId = this.route.snapshot.params['id'] ?? '';
    const q = this.route.snapshot.queryParamMap;
    this.installmentNumber = Number(q.get('installment') ?? 0);
    this.expectedAmount = Number(q.get('amount') ?? 0);
    if (this.expectedAmount > 0) {
      this.form.patchValue({ mobileMoneyAmount: this.expectedAmount });
    }
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
      const err = e as { error?: { message?: string } };
      this.error = err?.error?.message ?? 'Erreur lors de la soumission.';
    } finally {
      this.isLoading = false;
    }
  }

  goHome(): void {
    void this.router.navigate(['/dashboard']);
  }
}
