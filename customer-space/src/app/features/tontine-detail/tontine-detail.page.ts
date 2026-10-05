import { Component, OnInit , inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerTontineContributionDetail } from '../../shared/models/customer.model';
import { TontineMonthlyPillsComponent } from '../../shared/components/tontine-monthly-pills/tontine-monthly-pills.component';
import { ElykPageHeaderComponent } from '../../shared/ui';

import { LayoutService } from '../../shared/layout/layout.service';
import { TontineDetailDesktopComponent } from './desktop/tontine-detail-desktop.component';
@Component({
  selector: 'app-tontine-detail',
  standalone: true,
  imports: [
    TontineDetailDesktopComponent,
    CommonModule,
    IonicModule,
    RouterModule,
    TontineMonthlyPillsComponent,
    ElykPageHeaderComponent,
  ],
  templateUrl: './tontine-detail.page.html',
  styleUrls: ['./tontine-detail.page.scss'],
})
export class TontineDetailPage implements OnInit {
  readonly layout = inject(LayoutService);
  memberId = '';
  detail: CustomerTontineContributionDetail | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private api: CustomerApiService,
    private router: Router,
  ) {}

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

  /** Progression desktop : dénominateur = mois du carnet du membre. */
  desktopProgressPercent(): number {
    if (!this.detail) return 0;
    const validated = this.detail.validatedMonths ?? 0;
    const total = this.memberMonths;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((validated / total) * 100));
  }

  /** Nombre de mois du carnet du membre (même source que le carnet mobile). */
  get memberMonths(): number {
    const rows = this.detail?.monthlySummaries?.length ?? 0;
    if (rows <= 0) {
      return 10;
    }
    return Math.min(10, rows);
  }

  goBack(): void {
    void this.router.navigate(['/tontines']);
  }
}
