import { Component, OnInit , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Page Confirmation Commande — Type C. */
import { LayoutService } from '../../shared/layout/layout.service';
import { OrderConfirmationDesktopComponent } from './desktop/order-confirmation-desktop.component';
@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [
    OrderConfirmationDesktopComponent,CommonModule, IonicModule, RouterModule, ElykPageHeaderComponent],
  templateUrl: './order-confirmation.page.html',
  styleUrls: ['./order-confirmation.page.scss'],
})
export class OrderConfirmationPage implements OnInit {
  readonly layout = inject(LayoutService);
  reference = '';
  totalAmount = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.reference = this.route.snapshot.queryParamMap.get('reference') ?? '—';
    this.totalAmount = Number(this.route.snapshot.queryParamMap.get('amount') ?? 0);
  }
}
