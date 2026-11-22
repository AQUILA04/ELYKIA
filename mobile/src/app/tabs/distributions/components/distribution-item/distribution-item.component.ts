import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import {DistributionView} from "../../../../models/distribution-view.model";

@Component({
  selector: 'app-distribution-item',
  templateUrl: './distribution-item.component.html',
  styleUrls: ['./distribution-item.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class DistributionItemComponent  implements OnInit {

  @Input() distribution!: DistributionView;

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
