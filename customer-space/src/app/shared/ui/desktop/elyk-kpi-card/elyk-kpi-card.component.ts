import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-elyk-kpi-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="elyk-kpi" [attr.data-testid]="testId() || null" [class]="'elyk-kpi--' + variant()">
      <div class="elyk-kpi__icon" *ngIf="icon()" aria-hidden="true">
        <ion-icon [name]="icon()"></ion-icon>
      </div>
      <p class="elyk-kpi__label">{{ label() }}</p>
      <p class="elyk-kpi__value">{{ value() }}</p>
      <p class="elyk-kpi__hint" *ngIf="hint()">{{ hint() }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .elyk-kpi {
        background: var(--elyk-white);
        border-radius: var(--elyk-radius-card);
        box-shadow: var(--elyk-shadow-soft);
        padding: 20px;
        min-height: 110px;
        box-sizing: border-box;
      }
      .elyk-kpi__icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--elyk-gold-soft);
        color: var(--elyk-gold);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        font-size: 18px;
      }
      .elyk-kpi__label {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--elyk-gray-text);
      }
      .elyk-kpi__value {
        margin: 8px 0 0;
        font-family: 'Playfair Display', serif;
        font-size: 26px;
        font-weight: 700;
        color: var(--elyk-navy);
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
      }
      .elyk-kpi__hint {
        margin: 6px 0 0;
        font-size: 12px;
        color: var(--elyk-gray-text);
      }
      .elyk-kpi--gold .elyk-kpi__value {
        color: var(--elyk-gold);
      }
      .elyk-kpi--success .elyk-kpi__value {
        color: #15803d;
      }
      .elyk-kpi--danger .elyk-kpi__value {
        color: var(--elyk-red);
      }
    `,
  ],
})
export class ElykKpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>('');
  readonly icon = input<string>('');
  readonly variant = input<'default' | 'gold' | 'success' | 'danger'>('default');
  readonly testId = input<string>('');
}
