import { Component, Input } from '@angular/core';
import { TontineCollectionKpiDto } from '../../../models/tontine-collecte.model';

@Component({
  selector: 'app-tontine-collecte-kpi',
  template: `
    <div class="kpi-strip a2">
      <div class="kpi-card kpi-total">
        <div class="kpi-label">Nombre de Mises</div>
        <div class="kpi-value">{{ summary.totalMises | number }}</div>
        <div class="kpi-sub">Mises collectées</div>
      </div>
      <div class="kpi-card kpi-amount">
        <div class="kpi-label">Total Collecté</div>
        <div class="kpi-value">{{ summary.totalMontant | number }}</div>
        <div class="kpi-sub">FCFA collectés</div>
      </div>
    </div>
  `,
  standalone: false
})
export class TontineCollecteKpiComponent {
  @Input() summary: TontineCollectionKpiDto = { totalMises: 0, totalMontant: 0 };
  @Input() lastUpdate: Date = new Date();
}

