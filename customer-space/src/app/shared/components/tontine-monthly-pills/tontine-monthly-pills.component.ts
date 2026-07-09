import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerTontineMonthlySummary } from '../../models/customer.model';

interface MonthlyPillView {
  month: string;
  year: number;
  count: number;
  totalAmount: number;
  equivalentDays: number;
  isFuture: boolean;
  isCurrent: boolean;
  pillNumbers: number[];
}

@Component({
  selector: 'app-tontine-monthly-pills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="monthly-card" data-testid="e2e-tontine-monthly-pills">
      <div class="monthly-head">
        <h3>Carnet de mises mensuelles</h3>
      </div>

      <div class="monthly-empty" *ngIf="rows.length === 0">
        Donnees indisponibles.
      </div>

      <div class="monthly-row" *ngFor="let row of rows" [class.monthly-row--future]="row.isFuture">
        <div class="monthly-row-top">
          <span class="monthly-label">{{ row.month }} {{ row.year }}</span>
          <span class="monthly-stats" *ngIf="row.count > 0">
            {{ row.count }} collecte{{ row.count > 1 ? 's' : '' }} · {{ row.totalAmount | number:'1.0-0' }} FCFA
          </span>
        </div>

        <div class="monthly-pills" *ngIf="row.equivalentDays > 0" [attr.aria-label]="ariaLabel(row)">
          <span class="pill" *ngFor="let n of row.pillNumbers">{{ n }}</span>
        </div>

        <div class="monthly-note" *ngIf="row.equivalentDays === 0 && !row.isFuture && row.count > 0">
          Aucune equivalence carnet disponible.
        </div>
        <div class="monthly-note" *ngIf="row.count === 0 && !row.isFuture">
          Aucune collecte.
        </div>
        <div class="monthly-note" *ngIf="row.isFuture">
          Mois futur.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monthly-card { background:#fff; border-radius:16px; box-shadow:var(--elyk-shadow); padding:14px; }
    .monthly-head h3 { margin:0 0 10px; font-size:16px; color:var(--elyk-navy); }
    .monthly-empty { color:var(--elyk-gray-text); font-size:13px; }
    .monthly-row { border-top:1px solid #E5E7EB; padding:10px 0; }
    .monthly-row:first-of-type { border-top:none; padding-top:0; }
    .monthly-row-top { display:flex; justify-content:space-between; gap:8px; align-items:baseline; flex-wrap:wrap; }
    .monthly-label { font-weight:700; color:var(--elyk-navy-mid); }
    .monthly-stats { font-size:12px; color:var(--elyk-gray-text); }
    .monthly-pills { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; }
    .pill { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; background:var(--elyk-gold-light); color:var(--elyk-navy); }
    .monthly-note { margin-top:8px; font-size:12px; color:var(--elyk-gray-text); }
    .monthly-row--future .pill { opacity:.5; }
  `],
})
export class TontineMonthlyPillsComponent implements OnChanges {
  @Input() summaries: CustomerTontineMonthlySummary[] = [];
  rows: MonthlyPillView[] = [];

  ngOnChanges(): void {
    this.rows = (this.summaries ?? []).map((s) => ({
      ...s,
      equivalentDays: Math.max(0, Math.min(31, s.equivalentDays ?? 0)),
      pillNumbers: Array.from({ length: Math.max(0, Math.min(31, s.equivalentDays ?? 0)) }, (_, i) => i + 1),
    }));
  }

  ariaLabel(row: MonthlyPillView): string {
    return `${row.month} ${row.year} - ${row.equivalentDays} jour${row.equivalentDays > 1 ? 's' : ''} de carnet`;
  }
}
