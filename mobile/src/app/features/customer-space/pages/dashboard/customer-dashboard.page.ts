import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../services/customer-api.service';
import { CustomerDashboard } from '../../models/customer-dashboard.model';
import { CreditProgressCardComponent } from '../../components/credit-progress-card/credit-progress-card.component';

/**
 * Page Tableau de Bord Espace Client — S-03.
 * Affiche le crédit en cours, les actions rapides et les dernières activités.
 *
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CreditProgressCardComponent],
  templateUrl: './customer-dashboard.page.html',
  styleUrls: ['./customer-dashboard.page.scss'],
})
export class CustomerDashboardPage implements OnInit {
  dashboard: CustomerDashboard | null = null;
  isLoading = true;

  constructor(private apiService: CustomerApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    try {
      this.dashboard = await this.apiService.getDashboard().toPromise() ?? null;
    } finally {
      this.isLoading = false;
    }
  }
}
