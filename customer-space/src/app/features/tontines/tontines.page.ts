import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerTontineContributionSummary } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';

@Component({
  selector: 'app-tontines',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent],
  templateUrl: './tontines.page.html',
  styleUrls: ['./tontines.page.scss'],
})
export class TontinesPage implements OnInit {
  tontines: CustomerTontineContributionSummary[] = [];
  isLoading = true;

  constructor(private api: CustomerApiService) {}

  ngOnInit(): void {
    this.api.getTontineContributions().subscribe({
      next: (items) => {
        this.tontines = items;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  statusLabel(status: string): string {
    if (status === 'SESSION_INPROGRESS') return 'Session active';
    if (status === 'PENDING') return 'En attente livraison';
    if (status === 'VALIDATED') return 'Livraison validee';
    if (status === 'DELIVERED') return 'Livree';
    return status;
  }
}
