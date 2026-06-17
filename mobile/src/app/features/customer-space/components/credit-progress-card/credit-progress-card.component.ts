import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Composant CreditProgressCard
 *
 * Affiche un résumé visuel du crédit en cours :
 * montant total, payé, restant, et barre de progression.
 *
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-credit-progress-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="credit-card">
      <div class="credit-card__header">
        <span class="credit-card__label">Crédit en cours</span>
        <span class="credit-card__ref">{{ reference }}</span>
      </div>
      <div class="credit-card__amount">{{ totalAmount | number:'1.0-0' }} FCFA</div>
      <div class="credit-card__progress-bar">
        <div
          class="credit-card__progress-fill"
          [style.width.%]="progressPercent"
        ></div>
      </div>
      <div class="credit-card__stats">
        <div class="stat">
          <span class="stat__value">{{ paidAmount | number:'1.0-0' }} FCFA</span>
          <span class="stat__label">Payé</span>
        </div>
        <div class="stat stat--center">
          <span class="stat__value stat__value--gold">{{ progressPercent | number:'1.0-0' }}%</span>
          <span class="stat__label">Progression</span>
        </div>
        <div class="stat stat--right">
          <span class="stat__value">{{ remainingAmount | number:'1.0-0' }} FCFA</span>
          <span class="stat__label">Restant</span>
        </div>
      </div>
      <div class="credit-card__next" *ngIf="nextPaymentAmount > 0">
        <span class="next__label">Prochaine mise</span>
        <span class="next__amount">{{ nextPaymentAmount | number:'1.0-0' }} FCFA</span>
        <span class="next__date">{{ nextPaymentDate }}</span>
      </div>
    </div>
  `,
  styles: [`
    .credit-card {
      background: linear-gradient(135deg, #0D1B2A 0%, #1A2E42 100%);
      border-radius: 20px;
      padding: 20px;
      color: #fff;
      box-shadow: 0 8px 32px rgba(13,27,42,0.25);
      margin-bottom: 16px;
    }
    .credit-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .credit-card__label {
      font-size: 12px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .credit-card__ref {
      font-size: 11px;
      color: #C9922A;
      font-weight: 600;
    }
    .credit-card__amount {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 16px;
      font-family: 'Playfair Display', serif;
    }
    .credit-card__progress-bar {
      height: 6px;
      background: rgba(255,255,255,0.15);
      border-radius: 3px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .credit-card__progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #C9922A, #F0C66A);
      border-radius: 3px;
      transition: width 0.6s ease;
    }
    .credit-card__stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .stat { display: flex; flex-direction: column; }
    .stat--center { align-items: center; }
    .stat--right { align-items: flex-end; }
    .stat__value { font-size: 14px; font-weight: 600; }
    .stat__value--gold { color: #F0C66A; font-size: 16px; }
    .stat__label { font-size: 11px; color: #94A3B8; margin-top: 2px; }
    .credit-card__next {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 10px 14px;
      border: 1px solid rgba(201,146,42,0.2);
    }
    .next__label { font-size: 11px; color: #94A3B8; flex: 1; }
    .next__amount { font-size: 14px; font-weight: 700; color: #F0C66A; }
    .next__date { font-size: 11px; color: #64748B; }
  `],
})
export class CreditProgressCardComponent {
  @Input() reference: string = '';
  @Input() totalAmount: number = 0;
  @Input() paidAmount: number = 0;
  @Input() remainingAmount: number = 0;
  @Input() progressPercent: number = 0;
  @Input() nextPaymentAmount: number = 0;
  @Input() nextPaymentDate: string = '';
}
