import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerApiService } from '../../services/customer-api.service';
/** Page Paiement Mobile Money — S-07, S-08. @author Francis AHONSU */
@Component({ selector: 'app-customer-payment', standalone: true, imports: [CommonModule, IonicModule, ReactiveFormsModule], templateUrl: './customer-payment.page.html', styleUrls: ['./customer-payment.page.scss'] })
export class CustomerPaymentPage implements OnInit {
  form: FormGroup;
  distributionId = '';
  isLoading = false;
  isSubmitted = false;
  errorMessage = '';
  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private apiService: CustomerApiService) {
    this.form = this.fb.group({ mobileMoneyPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)]], mobileMoneyAmount: [null, [Validators.required, Validators.min(1)]], mobileMoneyReference: ['', Validators.required], notes: [''] });
  }
  ngOnInit(): void { this.distributionId = this.route.snapshot.params['distributionId']; }
  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading = true;
    try {
      await this.apiService.submitMobileMoneyPayment({ distributionId: this.distributionId, installmentNumber: 0, expectedAmount: 0, ...this.form.value }).toPromise();
      this.isSubmitted = true;
    } catch (e: any) { this.errorMessage = e?.error?.message ?? 'Erreur lors de la soumission.'; }
    finally { this.isLoading = false; }
  }
}
