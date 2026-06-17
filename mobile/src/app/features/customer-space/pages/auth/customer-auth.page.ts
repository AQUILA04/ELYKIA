import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerApiService } from '../../services/customer-api.service';
import { CustomerSessionService } from '../../services/customer-session.service';

/**
 * Page d'authentification de l'Espace Client ELYKIA.
 * Connexion via numéro de téléphone + code PIN (S-01, S-02).
 *
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-customer-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './customer-auth.page.html',
  styleUrls: ['./customer-auth.page.scss'],
})
export class CustomerAuthPage {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private apiService: CustomerApiService,
    private sessionService: CustomerSessionService,
    private router: Router
  ) {
    this.form = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)]],
      pin: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const response = await this.apiService.login(this.form.value).toPromise();
      if (response) {
        this.sessionService.saveSession({
          ...response,
          isAuthenticated: true,
        });
        this.router.navigate(['/customer/dashboard']);
      }
    } catch (err: any) {
      this.errorMessage = err?.error?.message ?? 'Numéro ou code PIN incorrect.';
    } finally {
      this.isLoading = false;
    }
  }
}
