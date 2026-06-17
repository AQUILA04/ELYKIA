import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
/** Page Paiement Mobile Money — S-07, S-08. @author Francis AHONSU */
@Component({ selector: 'app-payment', standalone: true, imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule], templateUrl: './payment.page.html', styleUrls: ['./payment.page.scss'] })
export class PaymentPage implements OnInit {
  form: FormGroup;
  distributionId = '';
  isLoading = false;
  isSubmitted = false;
  error = '';
  constructor(private fb: FormBuilder, private route: ActivatedRoute, private api: CustomerApiService) {
    this.form = this.fb.group({ mobileMoneyPhone: ['', Validators.required], mobileMoneyAmount: [null, [Validators.required, Validators.min(1)]], mobileMoneyReference: ['', Validators.required], notes: [''] });
  }
  ngOnInit(): void { this.distributionId = this.route.snapshot.params['id'] ?? ''; }
  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading = true; this.error = '';
    try { await this.api.submitMobileMoneyPayment({ distributionId: this.distributionId, installmentNumber: 0, expectedAmount: 0, ...this.form.value }).toPromise(); this.isSubmitted = true; }
    catch (e: any) { this.error = e?.error?.message ?? 'Erreur lors de la soumission.'; }
    finally { this.isLoading = false; }
  }
}
