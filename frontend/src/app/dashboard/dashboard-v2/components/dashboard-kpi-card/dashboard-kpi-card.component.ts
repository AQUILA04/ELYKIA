import { Component, Input } from '@angular/core';

export interface DashboardKpiCardData {
  icon: string;
  iconClass: string;
  title: string;
  value: string;
  subtitle?: string;
}

@Component({
  selector: 'app-dashboard-kpi-card',
  templateUrl: './dashboard-kpi-card.component.html',
  styleUrls: ['./dashboard-kpi-card.component.scss']
})
export class DashboardKpiCardComponent {
  @Input() data!: DashboardKpiCardData;
  @Input() loading = false;
}
