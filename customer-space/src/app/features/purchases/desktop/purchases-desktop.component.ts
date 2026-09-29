import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CustomerPurchase } from '../../../shared/models/customer.model';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-purchases-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  templateUrl: './purchases-desktop.component.html',
  styleUrls: ['./purchases-desktop.component.scss'],
})
export class PurchasesDesktopComponent {
  readonly filtered = input<CustomerPurchase[]>([]);
  readonly isLoading = input(false);
  readonly statusFilter = input('ALL');
  readonly filters = input<{ value: string; label: string }[]>([]);
  readonly setFilter = output<any>();
  readonly statusLabel = input<(s: string) => string>((s) => s);
  readonly statusChipClass = input<(s: string) => string>(() => '');
  readonly progressPercent = input<(p: CustomerPurchase) => number>(() => 0);
}
