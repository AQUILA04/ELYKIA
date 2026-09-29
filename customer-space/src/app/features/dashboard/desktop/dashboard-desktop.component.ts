import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerDashboard } from '../../../shared/models/customer.model';
import { CreditProgressCardComponent } from '../../../shared/components/credit-progress-card/credit-progress-card.component';
import { ElykDesktopPageComponent, ElykKpiCardComponent } from '../../../shared/ui';

@Component({
  selector: 'app-dashboard-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CreditProgressCardComponent, ElykDesktopPageComponent, ElykKpiCardComponent],
  templateUrl: './dashboard-desktop.component.html',
  styleUrls: ['./dashboard-desktop.component.scss'],
})
export class DashboardDesktopComponent {
  readonly displayName = input('');
  readonly dashboard = input<CustomerDashboard | null>(null);
  readonly isLoading = input(false);
  readonly loadError = input(false);
  readonly canPayNext = input(false);
  readonly paymentQueryParams = input<Record<string, number> | null>(null);
  readonly creditReference = input('');
  readonly formattedNextDate = input('');
  readonly retry = output<void>();

  fmt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('fr-FR') + ' F';
  }
}
