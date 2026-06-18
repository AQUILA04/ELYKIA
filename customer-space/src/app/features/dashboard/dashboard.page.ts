import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { CustomerDashboard } from '../../shared/models/customer.model';
import { CreditProgressCardComponent } from '../../shared/components/credit-progress-card/credit-progress-card.component';
/** Page Tableau de Bord — S-03. @author Francis AHONSU */
@Component({ selector: 'app-dashboard', standalone: true, imports: [CommonModule, IonicModule, RouterModule, CreditProgressCardComponent], templateUrl: './dashboard.page.html', styleUrls: ['./dashboard.page.scss'] })
export class DashboardPage implements OnInit {
  dashboard: CustomerDashboard | null = null;
  isLoading = true;
  get clientName() { return this.session.currentSession?.fullName ?? ''; }
  constructor(private api: CustomerApiService, private session: CustomerSessionService) {}
  ngOnInit(): void { this.api.getDashboard().subscribe({ next: d => { this.dashboard = d; this.isLoading = false; }, error: () => this.isLoading = false }); }
}
