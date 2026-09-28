import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Page Suivi Commande — Type C (placeholder métier). */
@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykPageHeaderComponent],
  templateUrl: './order-tracking.page.html',
  styleUrls: ['./order-tracking.page.scss'],
})
export class OrderTrackingPage {
  constructor(private router: Router) {}

  goBack(): void {
    void this.router.navigate(['/purchases']);
  }
}
