import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerTontinePayment } from '../../shared/models/customer.model';

@Component({
  selector: 'app-tontine-timeline',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './tontine-timeline.page.html',
  styleUrls: ['./tontine-timeline.page.scss'],
})
export class TontineTimelinePage implements OnInit {
  memberId = '';
  payments: CustomerTontinePayment[] = [];
  isLoading = true;

  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}

  ngOnInit(): void {
    this.memberId = this.route.snapshot.params['id'];
    this.api.getTontinePayments(this.memberId).subscribe({
      next: (page) => {
        this.payments = page.items;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
}
