
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerTontineContributionDetail } from '../../../shared/models/customer.model';
import { TontineMonthlyPillsComponent } from '../../../shared/components/tontine-monthly-pills/tontine-monthly-pills.component';
import { ElykDesktopPageComponent, ElykKpiCardComponent } from '../../../shared/ui';

@Component({
  selector: 'app-tontine-detail-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TontineMonthlyPillsComponent, ElykDesktopPageComponent, ElykKpiCardComponent],
  templateUrl: './tontine-detail-desktop.component.html',
  styleUrls: ['./tontine-detail-desktop.component.scss'],
})
export class TontineDetailDesktopComponent {
  readonly memberId = input('');
  readonly detail = input<CustomerTontineContributionDetail | null>(null);
  readonly isLoading = input(false);
  readonly progressPercent = input(0);
  readonly back = output<void>();

  fmt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('fr-FR') + ' F';
  }
}
