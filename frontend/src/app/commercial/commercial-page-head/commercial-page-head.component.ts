import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-commercial-page-head',
  templateUrl: './commercial-page-head.component.html',
  styleUrls: ['../commercial-page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommercialPageHeadComponent {
  @Input() backLink = '/home';
  @Input() backLabel = 'Tableau de bord';
  @Input() currentDate = new Date();
}
