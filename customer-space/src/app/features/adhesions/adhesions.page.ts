import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { LayoutService } from '../../shared/layout/layout.service';
import { ElykDesktopPageComponent, ElykPageHeaderComponent } from '../../shared/ui';
import {
  AdhesionType,
  CustomerAdhesion,
  CustomerAdhesionSubmission,
} from '../../shared/models/customer.model';

@Component({
  selector: 'app-adhesions',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ElykPageHeaderComponent, ElykDesktopPageComponent],
  templateUrl: './adhesions.page.html',
  styleUrls: ['./adhesions.page.scss'],
})
export class AdhesionsPage implements OnInit {
  private readonly api = inject(CustomerApiService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);

  adhesions: CustomerAdhesion[] = [];
  submissions: CustomerAdhesionSubmission[] = [];
  isLoading = true;
  isSubmitting = false;
  error = '';
  success = '';
  adhesionType: AdhesionType = 'PERSONAL';
  requestKind: 'SUBSCRIBE' | 'TOP_UP' = 'SUBSCRIBE';
  phone = '';
  reference = '';
  topUpAmount: number | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.isLoading = true;
    this.api.getAdhesions().subscribe({
      next: (overview) => {
        this.adhesions = overview.adhesions ?? [];
        this.submissions = overview.submissions ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Impossible de charger vos adhésions.';
        this.isLoading = false;
      },
    });
  }

  label(type: string): string {
    if (type === 'BUSINESS') return 'Business';
    if (type === 'EVENT') return 'Événement';
    return 'Personnel';
  }

  declaredAmount(): number {
    if (this.requestKind === 'TOP_UP') {
      return Number(this.topUpAmount) || 0;
    }
    return this.adhesionType === 'PERSONAL' ? 500 : 2000;
  }

  goBack(): void {
    void this.router.navigate(['/dashboard']);
  }

  submit(): void {
    this.error = '';
    this.success = '';
    const amount = this.declaredAmount();
    if (!this.phone.trim() || !this.reference.trim() || amount <= 0) {
      this.error = 'Renseignez le numéro, la référence et un montant valide.';
      return;
    }
    this.isSubmitting = true;
    this.api.declareAdhesion({
      adhesionType: this.adhesionType,
      requestKind: this.requestKind,
      mobileMoneyPhone: this.phone.trim(),
      amount,
      mobileMoneyReference: this.reference.trim(),
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success = 'Déclaration envoyée. L\'agence la vérifiera avant de l\'appliquer.';
        this.reference = '';
        this.reload();
      },
      error: (err: { error?: { message?: string } }) => {
        this.isSubmitting = false;
        this.error = err?.error?.message ?? 'Déclaration impossible.';
      },
    });
  }
}
