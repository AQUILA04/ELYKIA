import { Component , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Page Suivi Commande — Type C (placeholder métier). */
import { LayoutService } from '../../shared/layout/layout.service';
import { OrderTrackingDesktopComponent } from './desktop/order-tracking-desktop.component';
@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [
    OrderTrackingDesktopComponent,CommonModule, IonicModule, RouterModule, ElykPageHeaderComponent],
  templateUrl: './order-tracking.page.html',
  styleUrls: ['./order-tracking.page.scss'],
})
export class OrderTrackingPage {
  readonly layout = inject(LayoutService);
  constructor(private router: Router) {}

  goBack(): void {
    void this.router.navigate(['/purchases']);
  }
}
