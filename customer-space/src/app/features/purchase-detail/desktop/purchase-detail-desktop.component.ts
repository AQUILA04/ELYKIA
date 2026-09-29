
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerPurchase } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-purchase-detail-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  templateUrl: './purchase-detail-desktop.component.html',
  styleUrls: ['./purchase-detail-desktop.component.scss'],
})
export class PurchaseDetailDesktopComponent {
  readonly purchase = input<CustomerPurchase | null>(null);
  readonly isLoading = input(false);
  readonly progressPercent = input(0);
  readonly statusLabel = input('');
  readonly statusChipClass = input('');
  readonly canPay = input(false);
  readonly paymentQueryParams = input<Record<string, number>>({});
  readonly back = output<void>();
}
