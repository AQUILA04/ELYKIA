import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-credit-late-kpi',
  templateUrl: './credit-late-kpi.component.html',
  styleUrls: ['./credit-late-kpi.component.scss'],
  standalone: false
})
export class CreditLateKpiComponent {
  @Input() totalLate: number = 0;
  @Input() totalDelai: number = 0;
  @Input() totalEcheance: number = 0;
  @Input() totalAmountRemaining: number = 0;
}
