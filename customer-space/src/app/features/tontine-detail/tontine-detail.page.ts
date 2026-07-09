import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerTontineContributionDetail } from '../../shared/models/customer.model';
import { TontineMonthlyPillsComponent } from '../../shared/components/tontine-monthly-pills/tontine-monthly-pills.component';

@Component({
  selector: 'app-tontine-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TontineMonthlyPillsComponent],
  templateUrl: './tontine-detail.page.html',
  styleUrls: ['./tontine-detail.page.scss'],
})
export class TontineDetailPage implements OnInit {
  memberId = '';
  detail: CustomerTontineContributionDetail | null = null;
  isLoading = true;

  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}

  ngOnInit(): void {
    this.memberId = this.route.snapshot.params['id'];
    this.api.getTontineContributionById(this.memberId).subscribe({
      next: (data) => {
        this.detail = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  progressPercent(): number {
    if (!this.detail) return 0;
    const validated = this.detail.validatedMonths ?? 0;
    return Math.min(100, (validated / 10) * 100);
  }
}
