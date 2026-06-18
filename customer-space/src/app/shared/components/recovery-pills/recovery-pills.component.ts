import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerRecovery } from '../../models/customer.model';

export type PillStatus = 'VALIDE' | 'INITIE' | 'RETARD' | 'RESTANT';

export interface PillData {
  number: number;
  status: PillStatus;
  recovery?: CustomerRecovery;
}

/**
 * RecoveryPillsComponent
 *
 * Grille de pastilles numérotées (1 à N, max 31) représentant les échéances.
 *
 * Code couleur :
 *  - Vert   (#22C55E) : VALIDÉ — confirmé par l'agence
 *  - Orange (#F97316) : INITIÉ — soumis, en attente de validation
 *  - Rouge  (#EF4444) : RETARD — non payé à l'échéance
 *  - Gris   (#D1D5DB) : RESTANT — échéance future
 *
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-recovery-pills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pills-card">
      <div class="pills-grid">
        <div
          *ngFor="let pill of pills"
          class="pill"
          [class.pill--valide]="pill.status === 'VALIDE'"
          [class.pill--initie]="pill.status === 'INITIE'"
          [class.pill--retard]="pill.status === 'RETARD'"
          [class.pill--restant]="pill.status === 'RESTANT'"
          [title]="getTooltip(pill)"
        >{{ pill.number }}</div>
      </div>
      <div class="pills-legend">
        <span class="legend-item"><span class="dot dot--valide"></span>Validé</span>
        <span class="legend-item"><span class="dot dot--initie"></span>Initié</span>
        <span class="legend-item"><span class="dot dot--retard"></span>Retard</span>
        <span class="legend-item"><span class="dot dot--restant"></span>Restant</span>
      </div>
    </div>
  `,
  styles: [`
    .pills-card { background:#fff; border-radius:14px; box-shadow:0 2px 14px rgba(13,27,42,.08); padding:14px 16px; }
    .pills-grid { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
    .pill { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; color:#fff; cursor:default; transition:transform .15s; }
    .pill:hover { transform:scale(1.12); }
    .pill--valide  { background:#22C55E; }
    .pill--initie  { background:#F97316; }
    .pill--retard  { background:#EF4444; }
    .pill--restant { background:#D1D5DB; color:#6B7280; }
    .pills-legend { display:flex; gap:12px; flex-wrap:wrap; }
    .legend-item { display:flex; align-items:center; gap:5px; font-size:11px; color:#64748B; }
    .dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
    .dot--valide  { background:#22C55E; }
    .dot--initie  { background:#F97316; }
    .dot--retard  { background:#EF4444; }
    .dot--restant { background:#D1D5DB; }
  `],
})
export class RecoveryPillsComponent implements OnChanges {
  @Input() totalInstallments = 12;
  @Input() recoveries: CustomerRecovery[] = [];

  pills: PillData[] = [];

  ngOnChanges(): void { this.build(); }

  private build(): void {
    const count = Math.min(this.totalInstallments, 31);
    this.pills = Array.from({ length: count }, (_, i) => {
      const n = i + 1;
      const r = this.recoveries.find(x => x.installmentNumber === n);
      return { number: n, status: r ? (r.status as PillStatus) : 'RESTANT', recovery: r };
    });
  }

  getTooltip(pill: PillData): string {
    if (!pill.recovery) return `Échéance #${pill.number} — À venir`;
    const d = pill.recovery.paymentDate
      ? new Date(pill.recovery.paymentDate).toLocaleDateString('fr-FR') : '—';
    return `Échéance #${pill.number} — ${pill.status} — ${d}`;
  }
}
