import { Component, OnInit , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerTontinePayment } from '../../shared/models/customer.model';
import { ElykPageHeaderComponent } from '../../shared/ui';

import { LayoutService } from '../../shared/layout/layout.service';
import { TontineTimelineDesktopComponent } from './desktop/tontine-timeline-desktop.component';
@Component({
  selector: 'app-tontine-timeline',
  standalone: true,
  imports: [
    TontineTimelineDesktopComponent,CommonModule, IonicModule, RouterModule, ElykPageHeaderComponent],
  templateUrl: './tontine-timeline.page.html',
  styleUrls: ['./tontine-timeline.page.scss'],
})
export class TontineTimelinePage implements OnInit {
  readonly layout = inject(LayoutService);
  memberId = '';
  payments: CustomerTontinePayment[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private api: CustomerApiService,
    private router: Router,
  ) {}

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

  goBack(): void {
    void this.router.navigate(['/tontines', this.memberId]);
  }
}
