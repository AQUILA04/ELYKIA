import { Component, Input } from '@angular/core';
import { KPICardConfig } from '../../types/tontine.types';

@Component({
  selector: 'app-tontine-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class TontineKpiCardComponent {
  @Input() config!: KPICardConfig;

  getKpiClass(): string {
    const map: Record<string, string> = {
      primary: 'kpi-total',
      success: 'kpi-green',
      warning: 'kpi-echeance',
      info: 'kpi-amount',
      accent: 'kpi-total',
      danger: 'kpi-delai'
    };
    return map[this.config.color] || 'kpi-total';
  }
}
