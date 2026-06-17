import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerRecovery, CustomerRecoveryStatus } from '../../models/customer-dashboard.model';

export interface PillData {
  number: number;
  status: 'VALIDE' | 'INITIE' | 'RETARD' | 'RESTANT';
  recovery?: CustomerRecovery;
}

/**
 * Composant RecoveryPills
 *
 * Affiche une grille de pastilles numérotées (1 à N, max 31) représentant
 * les échéances d'un crédit. Code couleur :
 *  - Vert  (#22C55E) : VALIDÉ — mise confirmée par l'agence
 *  - Orange (#F97316) : INITIÉ — mise soumise, en attente de validation
 *  - Rouge  (#EF4444) : RETARD — mise non payée à l'échéance
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
          [ngClass]="'pill--' + pill.status.toLowerCase()"
          [title]="getPillTooltip(pill)"
        >
          {{ pill.number }}
        </div>
      </div>
      <div class="pills-legend">
        <span class="legend-item">
          <span class="legend-dot legend-dot--valide"></span> Validé
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-dot--initie"></span> Initié
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-dot--retard"></span> Retard
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-dot--restant"></span> Restant
        </span>
      </div>
    </div>
  `,
  styles: [`
    .pills-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(13,27,42,0.07);
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .pills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .pill {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      cursor: default;
      transition: transform 0.15s;
      color: #fff;
    }
    .pill:hover { transform: scale(1.12); }
    .pill--valide  { background: #22C55E; }
    .pill--initie  { background: #F97316; }
    .pill--retard  { background: #EF4444; }
    .pill--restant { background: #D1D5DB; color: #6B7280; }

    .pills-legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748B;
    }
    .legend-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .legend-dot--valide  { background: #22C55E; }
    .legend-dot--initie  { background: #F97316; }
    .legend-dot--retard  { background: #EF4444; }
    .legend-dot--restant { background: #D1D5DB; }
  `],
})
export class RecoveryPillsComponent implements OnChanges {
  /** Nombre total d'échéances (max 31) */
  @Input() totalInstallments: number = 12;
  /** Recouvrements déjà enregistrés */
  @Input() recoveries: CustomerRecovery[] = [];

  pills: PillData[] = [];

  ngOnChanges(): void {
    this.buildPills();
  }

  private buildPills(): void {
    const count = Math.min(this.totalInstallments, 31);
    this.pills = Array.from({ length: count }, (_, i) => {
      const number = i + 1;
      const recovery = this.recoveries.find((r) => r.installmentNumber === number);
      return {
        number,
        status: this.resolveStatus(recovery),
        recovery,
      };
    });
  }

  private resolveStatus(recovery?: CustomerRecovery): PillData['status'] {
    if (!recovery) return 'RESTANT';
    switch (recovery.status) {
      case 'VALIDE': return 'VALIDE';
      case 'INITIE': return 'INITIE';
      case 'RETARD': return 'RETARD';
      default: return 'RESTANT';
    }
  }

  getPillTooltip(pill: PillData): string {
    if (!pill.recovery) return `Échéance #${pill.number} — À venir`;
    const date = pill.recovery.paymentDate
      ? new Date(pill.recovery.paymentDate).toLocaleDateString('fr-FR')
      : '—';
    return `Échéance #${pill.number} — ${pill.status} — ${date}`;
  }
}
