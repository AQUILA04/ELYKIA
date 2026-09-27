import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import {
  CustomerTontineContributionSummary,
  CustomerTontineSession,
} from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { ElykPageHeaderComponent } from '../../shared/ui';

@Component({
  selector: 'app-tontines',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent, ElykPageHeaderComponent],
  templateUrl: './tontines.page.html',
  styleUrls: ['./tontines.page.scss'],
})
export class TontinesPage implements OnInit {
  tontines: CustomerTontineContributionSummary[] = [];
  session: CustomerTontineSession | null = null;
  isLoading = true;
  hasError = false;

  constructor(private api: CustomerApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    forkJoin({
      session: this.api.getCurrentTontineSession(),
      contributions: this.api.getTontineContributions(),
    }).subscribe({
      next: ({ session, contributions }) => {
        this.session = session;
        this.tontines = contributions;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  get showJoinHero(): boolean {
    return !!this.session?.joinable && !this.session?.alreadyMember;
  }

  get showMemberBanner(): boolean {
    return !!this.session?.alreadyMember && !!this.session?.available;
  }

  get showNoSession(): boolean {
    return !!this.session && !this.session.available;
  }

  get showClosedSession(): boolean {
    return !!this.session?.available && !this.session.joinable && !this.session.alreadyMember;
  }

  progressPercent(): number {
    if (!this.session?.startDate || !this.session?.endDate) {
      return 0;
    }
    const start = new Date(this.session.startDate).getTime();
    const end = new Date(this.session.endDate).getTime();
    const now = Date.now();
    if (end <= start) {
      return 0;
    }
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  daysRemaining(): number | null {
    if (!this.session?.endDate) {
      return null;
    }
    const end = new Date(this.session.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  formatFrDate(iso?: string): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  statusLabel(status: string): string {
    if (status === 'SESSION_INPROGRESS') return 'Session active';
    if (status === 'PENDING') return 'En attente livraison';
    if (status === 'VALIDATED') return 'Livraison validée';
    if (status === 'DELIVERED') return 'Livrée';
    return status;
  }
}
