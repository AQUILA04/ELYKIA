
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerPurchase, CustomerRecovery } from '../../../shared/models/customer.model';
import { RecoveryPillsComponent } from '../../../shared/components/recovery-pills/recovery-pills.component';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-recovery-timeline-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, RecoveryPillsComponent, ElykDesktopPageComponent],
  templateUrl: './recovery-timeline-desktop.component.html',
  styleUrls: ['./recovery-timeline-desktop.component.scss'],
})
export class RecoveryTimelineDesktopComponent {
  readonly distributionId = input('');
  readonly recoveries = input<CustomerRecovery[]>([]);
  readonly purchase = input<CustomerPurchase | null>(null);
  readonly totalInstallments = input(12);
  readonly isLoading = input(false);
  readonly canPay = input(false);
  readonly paymentQueryParams = input<Record<string, string | number>>({});
  readonly back = output<void>();
}
