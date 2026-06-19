import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { CustomerDashboard } from '../../shared/models/customer.model';
import { CreditProgressCardComponent } from '../../shared/components/credit-progress-card/credit-progress-card.component';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';

/** Page Tableau de Bord — S-03. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CreditProgressCardComponent, CustomerTabBarComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  dashboard: CustomerDashboard | null = null;
  isLoading = true;
  loadError = false;

  constructor(
    private api: CustomerApiService,
    private session: CustomerSessionService,
  ) {}

  get displayName(): string {
    return this.dashboard?.fullName
      ?? this.session.currentSession?.fullName
      ?? '';
  }

  get creditReference(): string {
    const count = this.dashboard?.activeCreditCount ?? 0;
    return count === 1 ? '1 crédit actif' : `${count} crédits actifs`;
  }

  get formattedNextDate(): string {
    if (!this.dashboard?.nextPaymentDate) return '';
    const d = new Date(this.dashboard.nextPaymentDate);
    return Number.isNaN(d.getTime())
      ? this.dashboard.nextPaymentDate
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.loadError = false;
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }
}
