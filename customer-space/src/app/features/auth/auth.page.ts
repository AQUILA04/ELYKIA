import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
/** Page Connexion — S-01, S-02. @author Francis AHONSU */
@Component({ selector: 'app-auth', standalone: true, imports: [CommonModule, ReactiveFormsModule, IonicModule], templateUrl: './auth.page.html', styleUrls: ['./auth.page.scss'] })
export class AuthPage {
  form: FormGroup;
  isLoading = false;
  error = '';
  constructor(private fb: FormBuilder, private api: CustomerApiService, private session: CustomerSessionService, private router: Router) {
    this.form = this.fb.group({ phone: ['', [Validators.required]], pin: ['', [Validators.required, Validators.minLength(4)]] });
  }
  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading = true; this.error = '';
    try {
      const res = await this.api.login(this.form.value).toPromise();
      if (res) { this.session.saveSession({ ...res, isAuthenticated: true }); this.router.navigate(['/dashboard']); }
    } catch (e: any) { this.error = e?.error?.message ?? 'Identifiants incorrects.'; }
    finally { this.isLoading = false; }
  }
}
