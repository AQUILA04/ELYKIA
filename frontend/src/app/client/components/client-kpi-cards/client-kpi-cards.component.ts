import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-client-kpi-cards',
  templateUrl: './client-kpi-cards.component.html',
  styleUrls: ['./client-kpi-cards.component.scss']
})
export class ClientKpiCardsComponent {
  @Input() clientDetails: any = {};
}
