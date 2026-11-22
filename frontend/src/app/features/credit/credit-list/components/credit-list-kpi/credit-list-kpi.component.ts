import { Component, Input } from '@angular/core';
import { CreditListSummary } from '../../../types/credit-list-summary.types';

@Component({
  selector: 'app-credit-list-kpi',
  templateUrl: './credit-list-kpi.component.html',
  styleUrls: ['./credit-list-kpi.component.scss'],
  standalone: false
})
export class CreditListKpiComponent {
  @Input() summary: CreditListSummary | null = null;
  @Input() periodLabel = '';
  @Input() loading = false;
  /** Masquer marge bénéficiaire (profil PROMOTER). */
  @Input() showMargin = true;

  formatFcfa(value: number | undefined | null): string {
    const n = value ?? 0;
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  }

  salesSubtitle(count: number, margin: number): string {
    const base = `${count} vente(s)`;
    if (!this.showMargin) {
      return base;
    }
    return `${base} · Marge ${this.formatFcfa(margin)} FCFA`;
  }

  inProgressSubtitle(count: number, margin: number, remaining: number): string {
    const base = this.salesSubtitle(count, margin);
    return `${base} · Reste ${this.formatFcfa(remaining)} FCFA`;
  }
}
