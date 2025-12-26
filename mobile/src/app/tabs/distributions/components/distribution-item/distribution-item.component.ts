import { Component, Input, OnInit } from '@angular/core';
import { Distribution } from '../../../../models/distribution.model';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-distribution-item',
  templateUrl: './distribution-item.component.html',
  styleUrls: ['./distribution-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DistributionItemComponent  implements OnInit {

  @Input() distribution!: Distribution;

  constructor() { }

  ngOnInit() {}

  getStatusLabel(status: string): string {
    switch (status) {
      case 'INPROGRESS':
      case 'ACTIVE':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'OVERDUE':
        return 'En retard';
      default:
        return 'Inconnu';
    }
  }
}