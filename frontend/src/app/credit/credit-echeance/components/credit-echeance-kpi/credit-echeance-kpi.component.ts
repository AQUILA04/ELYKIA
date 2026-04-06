import { Component, Input } from '@angular/core';
import { CreditEcheanceSummaryDTO } from 'src/app/credit/models/credit-echeance.model';

@Component({
  selector: 'app-credit-echeance-kpi',
  templateUrl: './credit-echeance-kpi.component.html',
  styleUrls: ['./credit-echeance-kpi.component.scss'],
  standalone: false
})
export class CreditEcheanceKpiComponent {
  @Input() totalToday: number = 0;
  @Input() totalWeek: number = 0;
  @Input() totalUnsettled: number = 0;
  @Input() totalAmountRemaining: number = 0;
}
