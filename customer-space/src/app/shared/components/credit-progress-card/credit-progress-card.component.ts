import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * CreditProgressCardComponent
 * Carte de progression du crédit (montant, barre, prochaine mise).
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-credit-progress-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="credit-card">
      <div class="credit-card__header">
        <span class="label">Crédit en cours</span>
        <span class="ref">{{ reference }}</span>
      </div>
      <div class="credit-card__amount">{{ totalAmount | number:'1.0-0' }} FCFA</div>
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercent"></div>
      </div>
      <div class="credit-card__stats">
        <div class="stat">
          <span class="stat__val">{{ paidAmount | number:'1.0-0' }}</span>
          <span class="stat__lbl">Payé</span>
        </div>
        <div class="stat center">
          <span class="stat__val gold">{{ progressPercent | number:'1.0-0' }}%</span>
          <span class="stat__lbl">Progression</span>
        </div>
        <div class="stat right">
          <span class="stat__val">{{ remainingAmount | number:'1.0-0' }}</span>
          <span class="stat__lbl">Restant</span>
        </div>
      </div>
      <div class="next-payment" *ngIf="nextPaymentAmount > 0">
        <span class="next__lbl">Prochaine mise</span>
        <span class="next__amt">{{ nextPaymentAmount | number:'1.0-0' }} FCFA</span>
        <span class="next__date">{{ nextPaymentDate }}</span>
      </div>
    </div>
  `,
  styles: [`
    .credit-card { background:linear-gradient(135deg,#0D1B2A 0%,#1A2E42 100%); border-radius:20px;
                   padding:20px; color:#fff; box-shadow:0 8px 32px rgba(13,27,42,.25); }
    .credit-card__header { display:flex; justify-content:space-between; margin-bottom:8px; }
    .label { font-size:11px; color:#94A3B8; text-transform:uppercase; letter-spacing:.08em; }
    .ref   { font-size:11px; color:#C9922A; font-weight:600; }
    .credit-card__amount { font-size:26px; font-weight:700; margin-bottom:16px; font-family:'Playfair Display',serif; }
    .progress-bar { height:6px; background:rgba(255,255,255,.15); border-radius:3px; margin-bottom:16px; overflow:hidden; }
    .progress-fill { height:100%; background:linear-gradient(90deg,#C9922A,#F0C66A); border-radius:3px; transition:width .6s ease; }
    .credit-card__stats { display:flex; justify-content:space-between; margin-bottom:14px; }
    .stat { display:flex; flex-direction:column; }
    .stat.center { align-items:center; }
    .stat.right  { align-items:flex-end; }
    .stat__val { font-size:14px; font-weight:600; }
    .stat__val.gold { color:#F0C66A; font-size:16px; }
    .stat__lbl { font-size:11px; color:#94A3B8; margin-top:2px; }
    .next-payment { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.06);
                    border-radius:10px; padding:10px 14px; border:1px solid rgba(201,146,42,.2); }
    .next__lbl  { font-size:11px; color:#94A3B8; flex:1; }
    .next__amt  { font-size:14px; font-weight:700; color:#F0C66A; }
    .next__date { font-size:11px; color:#64748B; }
  `],
})
export class CreditProgressCardComponent {
  @Input() reference = '';
  @Input() totalAmount = 0;
  @Input() paidAmount = 0;
  @Input() remainingAmount = 0;
  @Input() progressPercent = 0;
  @Input() nextPaymentAmount = 0;
  @Input() nextPaymentDate = '';
}
