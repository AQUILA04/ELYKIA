import { Component, Input } from '@angular/core';
import { KPICardConfig } from '../../types/tontine.types';

@Component({
  selector: 'app-tontine-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class TontineKpiCardComponent {
  @Input() config!: KPICardConfig;

  getColorClass(): string {
    return `kpi-card-${this.config.color}`;
  }
}
