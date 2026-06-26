import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';

/** Page Confirmation Commande — S-11. */
@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './order-confirmation.page.html',
  styleUrls: ['./order-confirmation.page.scss'],
})
export class OrderConfirmationPage implements OnInit {
  reference = '';
  totalAmount = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.reference = this.route.snapshot.queryParamMap.get('reference') ?? '—';
    this.totalAmount = Number(this.route.snapshot.queryParamMap.get('amount') ?? 0);
  }
}
