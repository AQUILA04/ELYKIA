import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-recouvrement-kpi',
  template: `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Nombre de Recouvrements</div>
          <div class="kpi-value">{{ totalMises | number }}</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon green">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Montant Recouvré</div>
          <div class="kpi-value">{{ totalMontant | number }} <span class="currency">FCFA</span></div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./recouvrement-kpi.component.scss'],
  standalone: false
})
export class RecouvrementKpiComponent {
  @Input() totalMises: number = 0;
  @Input() totalMontant: number = 0;
}
